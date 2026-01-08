
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool, Review, PoolHistory } from '../types';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

let supabase: SupabaseClient | null = null;

// Supabase 초기화 로직 보완
if (supabaseUrl && supabaseKey && supabaseUrl.startsWith('http')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
  } catch (e) {
    console.warn("[Storage] Supabase client init failed, falling back to LocalStorage.");
  }
}

const STORAGE_KEY = 'swimming_app_universal_pools';
const HISTORY_KEY = 'swimming_app_pool_history';

export const getStoredPools = async (): Promise<Pool[]> => {
  // 1. Supabase에서 먼저 시도
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
        
        // 로컬 스토리지 동기화 (오프라인 대비)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        return mapped;
      }
    } catch (e) {
      console.warn("[Storage] Supabase fetch error, fallback to LocalStorage.");
    }
  }

  // 2. 실패 시 로컬 스토리지 반환
  const local = localStorage.getItem(STORAGE_KEY);
  return local ? JSON.parse(local) : [];
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

  const local = localStorage.getItem(HISTORY_KEY);
  if (!local) return [];
  const allHistory: PoolHistory[] = JSON.parse(local);
  return allHistory.filter(h => h.poolId === poolId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const savePool = async (pool: Pool): Promise<boolean> => {
  const currentPools = await getStoredPools();
  const existingPool = currentPools.find(p => p.id === pool.id);

  // 1. 로컬 스토리지에 즉시 반영 (가장 확실한 저장)
  const updatedLocal = [pool, ...currentPools.filter(p => p.id !== pool.id)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLocal));

  // 2. Supabase에 비동기 저장 시도
  if (supabase) {
    try {
      // 이력 관리
      if (existingPool) {
        await supabase.from('pool_history').insert({
          pool_id: pool.id,
          snapshot_data: existingPool
        }).catch(() => {});
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
        });

      if (error) throw error;
      return true;
    } catch (e) {
      console.error("[Storage] Supabase save error:", e);
      // Supabase 저장에 실패해도 로컬에는 저장되었으므로 true를 반환하되 알림을 띄우는 것이 좋습니다.
      return true; 
    }
  }

  return true;
};

export const deletePool = async (poolId: string): Promise<boolean> => {
  // 로컬 우선 삭제
  const current = await getStoredPools();
  const filtered = current.filter(p => p.id !== poolId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

  if (supabase) {
    const { error } = await supabase.from('pools').delete().eq('id', poolId);
    return !error;
  }
  return true;
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
