
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool, Review, PoolHistory } from '../types';

/**
 * Vite 및 Vercel 환경에서 환경 변수 로드
 */
const getEnv = (key: string) => {
  return (import.meta as any).env?.[`VITE_${key}`] || 
         (import.meta as any).env?.[key] || 
         (process.env as any)?.[key] || "";
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_KEY');

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey && supabaseUrl.startsWith('http')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    console.log("[Storage] Supabase client initialized.");
  } catch (e) {
    console.error("[Storage] Supabase init failed:", e);
  }
}

const STORAGE_KEY = 'swimming_app_universal_pools';

/**
 * 로컬 스토리지 저장 보조 함수
 */
const saveToLocal = (pools: Pool[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pools));
};

export const getStoredPools = async (): Promise<Pool[]> => {
  let pools: Pool[] = [];
  
  // 1. DB 시도
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('pools')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        pools = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          address: item.address,
          region: item.region,
          phone: item.phone,
          imageUrl: item.image_url,
          lat: item.lat,
          lng: item.lng,
          lanes: item.lanes,
          length: item.length,
          hasKidsPool: item.has_kids_pool,
          hasHeatedPool: item.has_heated_pool,
          hasWalkingLane: item.has_walking_lane,
          extraFeatures: item.extra_features,
          freeSwimSchedule: item.free_swim_schedule || [],
          fees: item.fees || [],
          closedDays: item.closed_days || "",
          holidayOptions: item.holiday_options,
          reviews: item.reviews || [],
          isPublic: item.is_public !== false,
          createdAt: item.created_at
        }));
        saveToLocal(pools);
        return pools;
      }
    } catch (e) {
      console.error("[Storage] Fetch Exception:", e);
    }
  }
  
  // 2. DB 실패 시 로컬 시도
  const local = localStorage.getItem(STORAGE_KEY);
  return local ? JSON.parse(local) : [];
};

export const savePool = async (pool: Pool): Promise<{success: boolean, error?: string, code?: string}> => {
  // 로컬 업데이트 선행 (DB 연결 여부와 상관없이 사용자 경험을 위해)
  const currentPools = await getStoredPools();
  const index = currentPools.findIndex(p => p.id === pool.id);
  let updatedPools = [...currentPools];
  
  if (index >= 0) {
    updatedPools[index] = pool;
  } else {
    updatedPools = [pool, ...updatedPools];
  }
  saveToLocal(updatedPools);

  // Supabase가 없으면 로컬 저장 성공으로 리턴 (오류 메시지 대신)
  if (!supabase) {
    console.warn("[Storage] Saved to LocalStorage only (Supabase missing)");
    return { success: true };
  }

  try {
    const payload: any = {
      id: pool.id,
      name: pool.name,
      address: pool.address,
      region: pool.region,
      phone: pool.phone,
      image_url: pool.imageUrl,
      lat: pool.lat,
      lng: pool.lng,
      lanes: pool.lanes,
      length: pool.length,
      has_kids_pool: pool.hasKidsPool,
      has_heated_pool: pool.hasHeatedPool,
      has_walking_lane: pool.hasWalkingLane,
      extra_features: pool.extraFeatures,
      free_swim_schedule: pool.freeSwimSchedule,
      fees: pool.fees,
      closed_days: pool.closedDays,
      holiday_options: pool.holidayOptions,
      reviews: pool.reviews,
      is_public: pool.isPublic !== false
    };

    const { error } = await supabase.from('pools').upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error("[Storage] DB Upsert Error:", error);
      // DB 에러가 나더라도 이미 로컬엔 저장되었으므로 경고만 띄우거나 함
      return { success: true }; 
    }

    // 히스토리 저장
    try {
      await supabase.from('pool_history').insert({
        pool_id: pool.id,
        snapshot_data: pool
      });
    } catch (hErr) {}

    return { success: true };
  } catch (e: any) {
    // 예외 발생 시에도 이미 로컬 저장은 완료됨
    return { success: true };
  }
};

export const deletePool = async (poolId: string): Promise<boolean> => {
  const currentPools = await getStoredPools();
  saveToLocal(currentPools.filter(p => p.id !== poolId));
  
  if (!supabase) return true;
  try {
    const { error } = await supabase.from('pools').delete().eq('id', poolId);
    return !error;
  } catch (e) {
    return false;
  }
};

export const getPoolHistory = async (poolId: string): Promise<PoolHistory[]> => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('pool_history')
      .select('*')
      .eq('pool_id', poolId)
      .order('created_at', { ascending: false });
    if (!error && data) {
      return data.map((item: any) => ({
        id: item.id,
        poolId: item.pool_id,
        data: item.snapshot_data,
        createdAt: item.created_at
      }));
    }
  } catch (e) {}
  return [];
};

export const getMyReviews = (userId: string, pools: Pool[]): { poolName: string; review: Review }[] => {
  const myReviews: { poolName: string; review: Review }[] = [];
  pools.forEach(pool => {
    (pool.reviews || []).forEach(review => {
      if (review.userId === userId) {
        myReviews.push({ poolName: pool.name, review: review });
      }
    });
  });
  return myReviews;
};
