
export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  content: string;
  date: string;
}

export interface User {
  id: string;
  email: string;
  nickname: string;
  joinedAt: string;
}

export type DayType = string; 
export type FeeCategory = "평일" | "주말/공휴일" | "전체";

export interface FreeSwimSchedule {
  day: DayType;
  startTime: string;
  endTime: string;
}

export interface FeeInfo {
  type: 'adult' | 'teen' | 'child' | 'senior';
  category: FeeCategory;
  price: number;
  description?: string;
}

export interface HolidayRule {
  type: 'WEEKLY' | 'MONTHLY';
  weekNumber?: number; // 1, 2, 3, 4, 5 (0: 매주)
  dayOfWeek: number; // 0: 일, 1: 월 ... 6: 토
}

export interface Pool {
  id: string;
  name: string;
  address: string;
  region: string;
  phone: string;
  imageUrl: string;
  lat: number;
  lng: number;
  
  lanes: number;
  length: number;
  hasKidsPool: boolean;
  hasHeatedPool: boolean;
  hasWalkingLane: boolean;
  extraFeatures: string;

  freeSwimSchedule: FreeSwimSchedule[];
  fees: FeeInfo[];
  closedDays: string;
  holidayOptions?: {
    regularHolidayEnabled: boolean;
    specificHolidayEnabled: boolean;
    publicHolidayEnabled: boolean;
    temporaryHolidayEnabled: boolean;
    rules: HolidayRule[];
  };
  
  reviews: Review[];

  isPublic?: boolean; // 공개 여부 (기본값 true)
  createdBy?: string;
  createdAt?: string;
  lastModifiedBy?: string;
}

export interface PoolHistory {
  id: string;
  poolId: string;
  data: Pool;
  createdAt: string;
}

export type Region = "전체" | "서울" | "경기" | "인천" | "부산" | "대구" | "광주" | "대전" | "울산" | "세종" | "강원" | "경남" | "경북" | "전남" | "전북" | "충남" | "충북" | "제주" | "기타";
