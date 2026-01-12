
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool, Review, PoolHistory } from '../types';

/**
 * 환경 변수 로드 (Vite/Vercel 호환)
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
  } catch (e) {
    console.error("[Storage] Supabase init failed:", e);
  }
}

const STORAGE_KEY = 'swimming_app_universal_pools';

const saveToLocal = (pools: Pool[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pools));
};

export const getStoredPools = async (): Promise<Pool[]> => {
  let pools: Pool[] = [];
  
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
          homepageUrl: item.homepage_url,
          imageUrl: item.image_url,
          lat: item.lat,
          lng: item.lng,
          lanes: item.lanes,
          length: item.length,
          hasKidsPool: !!item.has_kids_pool,
          hasHeatedPool: !!item.has_heated_pool,
          hasWalkingLane: !!item.has_walking_lane,
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
  
  const local = localStorage.getItem(STORAGE_KEY);
  return local ? JSON.parse(local) : [];
};

export const savePool = async (pool: Pool): Promise<{success: boolean, error?: string}> => {
  // 로컬 저장소에 먼저 반영 (오프라인/즉각적인 UI 업데이트용)
  try {
    const currentPools = await getStoredPools();
    const index = currentPools.findIndex(p => p.id === pool.id);
    let updatedPools = [...currentPools];
    if (index >= 0) updatedPools[index] = pool;
    else updatedPools = [pool, ...updatedPools];
    saveToLocal(updatedPools);
  } catch (e) {}

  if (!supabase) {
    return { success: false, error: "Supabase 연결 정보가 없습니다." };
  }

  try {
    const payload: any = {
      id: pool.id,
      name: pool.name,
      address: pool.address,
      region: pool.region,
      phone: pool.phone || "",
      image_url: pool.imageUrl || "",
      lat: pool.lat,
      lng: pool.lng,
      lanes: pool.lanes || 0,
      length: pool.length || 0,
      has_kids_pool: !!pool.hasKidsPool,
      has_heated_pool: !!pool.hasHeatedPool,
      has_walking_lane: !!pool.hasWalkingLane,
      extra_features: pool.extraFeatures || "",
      free_swim_schedule: pool.freeSwimSchedule || [],
      fees: pool.fees || [],
      closed_days: pool.closedDays || "",
      holiday_options: pool.holidayOptions || null,
      reviews: pool.reviews || [],
      is_public: pool.isPublic !== false
    };

    // homepage_url 컬럼이 DB에 없을 수도 있으므로 안전하게 조건부 할당
    if (pool.homepageUrl !== undefined) {
      payload.homepage_url = pool.homepageUrl;
    }

    // 데이터 업서트
    const { error: upsertError } = await supabase
      .from('pools')
      .upsert(payload, { onConflict: 'id' });

    if (upsertError) {
      return { success: false, error: `${upsertError.message} (${upsertError.code})` };
    }

    // 변경 이력 저장 (별도의 try-catch로 감싸서 메인 저장을 방해하지 않게 함)
    try {
      await supabase.from('pool_history').insert({
        pool_id: pool.id,
        snapshot_data: pool
      });
    } catch (historyErr) {
      // 이력 저장 실패는 무시 가능
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
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
