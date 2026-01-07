
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool, Review } from '../types';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    console.error("Supabase 연결 실패:", e);
  }
}

export const getStoredPools = async (): Promise<Pool[]> => {
  if (!supabase) {
    console.warn("Supabase 설정이 없습니다. 로컬 데이터를 사용합니다.");
    const local = localStorage.getItem('swimming_app_universal_pools');
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
      closedDays: item.closed_days,
      holidayOptions: item.holiday_options,
      reviews: item.reviews || [],
      createdAt: item.created_at
    }));
  } catch (error) {
    console.error("데이터 로드 에러:", error);
    return [];
  }
};

export const savePool = async (pool: Pool): Promise<boolean> => {
  if (!supabase) {
    const current = await getStoredPools();
    const updated = [pool, ...current.filter(p => p.id !== pool.id)];
    localStorage.setItem('swimming_app_universal_pools', JSON.stringify(updated));
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
        closed_days: pool.closedDays,
        holiday_options: pool.holidayOptions,
        reviews: pool.reviews
      });

    if (error) throw error;
    return true;
  } catch (e) {
    console.error("저장 실패:", e);
    return false;
  }
};

/**
 * 모든 수영장의 리뷰를 삭제하는 관리자용 함수 (필요 시 호출)
 */
export const clearAllReviews = async (pools: Pool[]): Promise<Pool[]> => {
    const updatedPools = pools.map(p => ({ ...p, reviews: [] }));
    if (!supabase) {
        localStorage.setItem('swimming_app_universal_pools', JSON.stringify(updatedPools));
    } else {
        for (const pool of updatedPools) {
            await savePool(pool);
        }
    }
    return updatedPools;
};

export const deletePool = async (poolId: string): Promise<boolean> => {
  if (!supabase) return false;
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
