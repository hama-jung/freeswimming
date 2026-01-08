
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool, Review, PoolHistory } from '../types';

/**
 * Vite 및 Vercel 환경에서 가장 안정적인 환경 변수 로드 방식
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
} else {
  console.warn("[Storage] Supabase credentials missing. Check Vercel/Vite Environment Variables.");
}

const STORAGE_KEY = 'swimming_app_universal_pools';

export const getStoredPools = async (): Promise<Pool[]> => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('pools')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("[Storage] Fetch Error:", error.message);
      } else if (data) {
        const mapped = data.map((item: any) => ({
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        return mapped;
      }
    } catch (e) {
      console.error("[Storage] Fetch Exception:", e);
    }
  }
  const local = localStorage.getItem(STORAGE_KEY);
  return local ? JSON.parse(local) : [];
};

export const savePool = async (pool: Pool): Promise<{success: boolean, error?: string, code?: string}> => {
  if (!supabase) {
    return { 
      success: false, 
      error: "Supabase 연결 정보가 없습니다. Vercel 환경 변수를 확인하세요." 
    };
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
      // 특정 에러 코드(PGRST204: 컬럼 없음)에 대한 친절한 설명 추가
      if (error.code === 'PGRST204') {
        return { 
          success: false, 
          code: error.code,
          error: "데이터베이스 구조가 최신이 아닙니다. SQL Editor에서 'is_public' 컬럼을 추가해야 합니다." 
        };
      }
      return { success: false, code: error.code, error: error.message };
    }

    // 히스토리 저장
    supabase.from('pool_history').insert({
      pool_id: pool.id,
      snapshot_data: pool
    }).catch(() => {});

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "알 수 없는 시스템 오류" };
  }
};

export const deletePool = async (poolId: string): Promise<boolean> => {
  if (!supabase) return false;
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
