
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool, Review, PoolHistory } from '../types';

/**
 * Vite의 'define' 치환은 소스 코드 내의 'process.env.VARIABLE' 문자열을 정적으로 치환합니다.
 * 브라우저 환경에는 'process' 객체가 존재하지 않을 수 있으므로, 
 * 안전한 접근을 위해 별도의 상수로 추출하여 관리합니다.
 */

// Vite define에 의해 치환되거나, import.meta.env를 통해 주입된 값을 확인합니다.
const supabaseUrl: string = 
  (typeof process !== 'undefined' ? process.env.SUPABASE_URL : '') || 
  (import.meta as any).env?.VITE_SUPABASE_URL || 
  '';

const supabaseKey: string = 
  (typeof process !== 'undefined' ? process.env.SUPABASE_KEY : '') || 
  (import.meta as any).env?.VITE_SUPABASE_KEY || 
  '';

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey && supabaseUrl.startsWith('http')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    console.log("[Storage] Supabase client initialized.");
  } catch (e) {
    console.error("[Storage] Supabase initialization failed:", e);
  }
} else {
  // 배포 환경에서 이 메시지가 출력된다면 Vercel Dashboard -> Settings -> Environment Variables를 확인해야 합니다.
  console.warn("[Storage] Supabase credentials are missing or invalid.");
  console.info("Please ensure SUPABASE_URL and SUPABASE_KEY are set in your environment.");
  
  // 디버깅을 위한 상태 출력 (보안을 위해 값 자체는 출력하지 않음)
  console.debug("URL Available:", !!supabaseUrl, "Starts with http:", supabaseUrl?.startsWith('http'));
  console.debug("Key Available:", !!supabaseKey);
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
        console.error("[Storage] Supabase Select Error:", error.message);
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
      console.error("[Storage] Fetch exception:", e);
    }
  }
  const local = localStorage.getItem(STORAGE_KEY);
  return local ? JSON.parse(local) : [];
};

export const savePool = async (pool: Pool): Promise<boolean> => {
  if (!supabase) {
    console.error("[Storage] Supabase is NOT initialized. Check your environment variables.");
    return false;
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

    const { error } = await supabase
      .from('pools')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error("[Storage] DB Write Error:", error.message, error.details);
      return false;
    }

    supabase.from('pool_history').insert({
      pool_id: pool.id,
      snapshot_data: pool
    }).then(({ error: hError }) => {
      if (hError) console.warn("[Storage] History save warning:", hError.message);
    });

    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const updated = [pool, ...current.filter((p: any) => p.id !== pool.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    
    return true;
  } catch (e: any) {
    console.error("[Storage] Save exception:", e.message || e);
    return false;
  }
};

export const deletePool = async (poolId: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('pools').delete().eq('id', poolId);
    if (error) throw error;
    
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current.filter((p: any) => p.id !== poolId)));
    return true;
  } catch (e) {
    console.error("[Storage] Delete error:", e);
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
