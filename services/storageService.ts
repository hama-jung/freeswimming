
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool, Review, PoolHistory } from '../types';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey && supabaseUrl !== "" && supabaseKey !== "") {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("Supabase Client Initialized");
  } catch (e) {
    console.error("Supabase 연결 실패:", e);
  }
}

const STORAGE_KEY = 'swimming_app_universal_pools';
const HISTORY_KEY = 'swimming_app_pool_history';

export const getStoredPools = async (): Promise<Pool[]> => {
  if (!supabase) {
    console.log("[Storage] Using LocalStorage");
    const local = localStorage.getItem(STORAGE_KEY);
    return local ? JSON.parse(local) : [];
  }

  try {
    const { data, error } = await supabase
      .from('pools')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((item: any) => ({
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
      freeSwimSchedule: item.free_swim_schedule,
      fees: item.fees,
      closedDays: item.closed_days, // DB 컬럼 대응
      holidayOptions: item.holiday_options,
      reviews: item.reviews || [],
      isPublic: item.is_public !== false,
      createdAt: item.created_at
    }));
  } catch (error) {
    console.error("[Storage] Supabase Load Error:", error);
    const local = localStorage.getItem(STORAGE_KEY);
    return local ? JSON.parse(local) : [];
  }
};

export const getPoolHistory = async (poolId: string): Promise<PoolHistory[]> => {
  if (!supabase) {
    const local = localStorage.getItem(HISTORY_KEY);
    if (!local) return [];
    const allHistory: PoolHistory[] = JSON.parse(local);
    return allHistory.filter(h => h.poolId === poolId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  try {
    const { data, error } = await supabase
      .from('pool_history')
      .select('*')
      .eq('pool_id', poolId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((item: any) => ({
      id: item.id,
      poolId: item.pool_id,
      data: item.snapshot_data,
      createdAt: item.created_at
    }));
  } catch (e) {
    console.error("[Storage] History Load Error:", e);
    return [];
  }
};

export const savePool = async (pool: Pool): Promise<boolean> => {
  console.log("[Storage] Saving Pool:", pool.name);
  
  // 1. 기존 데이터 찾기 (이력 생성을 위해)
  const currentPools = await getStoredPools();
  const existingPool = currentPools.find(p => p.id === pool.id);

  // 2. 이력(Snapshot) 생성 - 실패해도 메인 저장은 계속되도록 try-catch 분리
  try {
    if (existingPool) {
      if (!supabase) {
        const historyLocal = localStorage.getItem(HISTORY_KEY);
        const allHistory = historyLocal ? JSON.parse(historyLocal) : [];
        const backup: PoolHistory = {
          id: `hist-${Date.now()}`,
          poolId: pool.id,
          data: { ...existingPool },
          createdAt: new Date().toISOString()
        };
        localStorage.setItem(HISTORY_KEY, JSON.stringify([backup, ...allHistory].slice(0, 100)));
      } else {
        await supabase.from('pool_history').insert({
          pool_id: pool.id,
          snapshot_data: existingPool
        });
      }
    }
  } catch (historyError) {
    console.warn("[Storage] History record failed:", historyError);
  }

  // 3. 메인 데이터 저장
  if (!supabase) {
    const updated = [pool, ...currentPools.filter(p => p.id !== pool.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return true;
  }

  try {
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
        closed_days: pool.closedDays, // 컬럼명 맞춤
        holiday_options: pool.holidayOptions,
        reviews: pool.reviews,
        is_public: pool.isPublic !== false
      });

    if (error) throw error;
    return true;
  } catch (e) {
    console.error("[Storage] Supabase Save Error:", e);
    // 실패 시 로컬 스토리지에 백업
    const updated = [pool, ...currentPools.filter(p => p.id !== pool.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return true; 
  }
};

export const deletePool = async (poolId: string): Promise<boolean> => {
  if (!supabase) {
    const pools = await getStoredPools();
    const filtered = pools.filter(p => p.id !== poolId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  }
  const { error } = await supabase.from('pools').delete().eq('id', poolId);
  return !error;
};

export const getMyReviews = (userId: string, pools: Pool[]): { poolName: string; review: Review }[] => {
  const myReviews: { poolName: string; review: Review }[] = [];
  pools.forEach(pool => {
    pool.reviews.forEach(review => {
      if (review.userId === userId) {
        myReviews.push({ poolName: pool.name, review: review });
      }
    });
  });
  return myReviews;
};
