
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool, Review, PoolHistory } from '../types';

// Vercel 및 Vite 환경 변수 모두 대응
const supabaseUrl = (typeof process !== 'undefined' ? process.env.SUPABASE_URL : '') || (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseKey = (typeof process !== 'undefined' ? process.env.SUPABASE_KEY : '') || (import.meta as any).env?.VITE_SUPABASE_KEY || '';

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey && supabaseUrl.startsWith('http')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    console.log("[Storage] Supabase client initialized successfully.");
  } catch (e) {
    console.error("[Storage] Supabase initialization failed:", e);
  }
} else {
  console.warn("[Storage] Supabase credentials missing. Check Vercel Environment Variables.");
}

const STORAGE_KEY = 'swimming_app_universal_pools';
const HISTORY_KEY = 'swimming_app_pool_history';

export const getStoredPools = async (): Promise<Pool[]> => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('pools')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
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
      } else if (error) {
        console.error("[Storage] Supabase fetch error:", error.message);
      }
    } catch (e) {
      console.error("[Storage] Supabase fetch exception:", e);
    }
  }

  const local = localStorage.getItem(STORAGE_KEY);
  return local ? JSON.parse(local) : [];
};

export const savePool = async (pool: Pool): Promise<boolean> => {
  // 1. 로컬 스토리지 선반영
  const currentPools = await getStoredPools();
  const existingPool = currentPools.find(p => p.id === pool.id);
  const updatedLocal = [pool, ...currentPools.filter(p => p.id !== pool.id)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLocal));

  // 2. Supabase 저장 시도
  if (!supabase) {
    console.error("[Storage] Supabase client is not initialized. Cannot save to cloud.");
    return false; // 클라우드 저장 실패를 명시적으로 알림
  }

  try {
    // 이력 백업 (선택 사항)
    if (existingPool) {
      await supabase.from('pool_history').insert({
        pool_id: pool.id,
        snapshot_data: existingPool
      }).catch(e => console.warn("[Storage] History backup failed", e));
    }

    const { error } = await supabase
      .from('pools')
      .upsert({
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
      }, { onConflict: 'id' });

    if (error) {
      console.error("[Storage] Supabase upsert error:", error.message, error.details);
      return false;
    }
    
    console.log("[Storage] Pool saved to Supabase successfully.");
    return true;
  } catch (e) {
    console.error("[Storage] Unexpected error during save:", e);
    return false;
  }
};

export const deletePool = async (poolId: string): Promise<boolean> => {
  const current = await getStoredPools();
  const filtered = current.filter(p => p.id !== poolId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

  if (supabase) {
    const { error } = await supabase.from('pools').delete().eq('id', poolId);
    if (error) {
      console.error("[Storage] Delete failed:", error.message);
      return false;
    }
  }
  return true;
};

export const getPoolHistory = async (poolId: string): Promise<PoolHistory[]> => {
  if (supabase) {
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
  }
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
