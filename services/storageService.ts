
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool, Review, PoolHistory } from '../types';

/**
 * Vite 빌드 타임에 환경 변수가 주입되도록 표준 형식을 사용합니다.
 * Vercel 환경 변수에 VITE_SUPABASE_URL, VITE_SUPABASE_KEY가 등록되어 있어야 합니다.
 */
// Fix: Use process.env instead of import.meta.env to resolve TypeScript 'Property env does not exist on type ImportMeta' errors.
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey && supabaseUrl.startsWith('http')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    console.log("[Storage] Supabase client linked.");
  } catch (e) {
    console.error("[Storage] Supabase init failed:", e);
  }
} else {
  // 배포된 환경에서 이 경고가 뜬다면 Vercel 설정에서 'VITE_' 접두사를 붙여 변수를 추가했는지 확인하세요.
  console.warn("[Storage] Supabase credentials missing or invalid format.");
  console.debug("URL exists:", !!supabaseUrl, "Key exists:", !!supabaseKey);
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

export const savePool = async (pool: Pool): Promise<{success: boolean, error?: string}> => {
  if (!supabase) {
    return { 
      success: false, 
      error: "Supabase 연결 정보가 없습니다. Vercel 환경 변수(VITE_SUPABASE_URL)를 확인하세요." 
    };
  }

  try {
    const payload = {
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
      return { success: false, error: `${error.message} (${error.code})` };
    }

    // 히스토리 비동기 저장
    supabase.from('pool_history').insert({
      pool_id: pool.id,
      snapshot_data: pool
    }).catch(e => console.warn("History save background error:", e));

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
