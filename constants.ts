
import { Pool, Region } from "./types";

export const REGIONS: Region[] = [
  "전체", "서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "강원", "경남", "경북", "전남", "전북", "충남", "충북", "제주"
];

export const MOCK_POOLS: Pool[] = [
  {
    id: "1",
    name: "올림픽 수영장",
    address: "서울특별시 송파구 올림픽로 424",
    region: "서울",
    phone: "02-410-1600",
    imageUrl: "https://picsum.photos/800/600?random=1",
    lat: 37.5207,
    lng: 127.1215,
    lanes: 10,
    length: 50,
    hasKidsPool: true,
    hasHeatedPool: false,
    hasWalkingLane: false,
    extraFeatures: "",
    freeSwimSchedule: [
        { day: "평일(월-금)", startTime: "13:00", endTime: "13:50" },
        { day: "평일(월-금)", startTime: "18:00", endTime: "18:50" },
        { day: "토요일", startTime: "09:00", endTime: "17:00" }
    ],
    fees: [
        { type: "adult", category: "평일", price: 6000 },
        { type: "teen", category: "평일", price: 5000 },
        { type: "child", category: "평일", price: 4000 }
    ],
    closedDays: "매월 둘째, 넷째 일요일",
    reviews: [
        { id: "r1", userId: "u1", userName: "물개", rating: 5, content: "물이 정말 깨끗하고 50m라 운동하기 좋아요.", date: "2024-05-01" },
        { id: "r2", userId: "u2", userName: "수린이", rating: 4, content: "사람이 좀 많지만 시설은 최고입니다.", date: "2024-05-02" }
    ]
  },
  {
    id: "2",
    name: "부산 사직 실내수영장",
    address: "부산광역시 동래구 사직로 45",
    region: "부산",
    phone: "051-500-2121",
    imageUrl: "https://picsum.photos/800/600?random=2",
    lat: 35.1901,
    lng: 129.0583,
    lanes: 8,
    length: 50,
    hasKidsPool: false,
    hasHeatedPool: false,
    hasWalkingLane: false,
    extraFeatures: "",
    freeSwimSchedule: [
        { day: "평일(월-금)", startTime: "06:00", endTime: "21:00" },
        { day: "토요일", startTime: "09:00", endTime: "18:00" }
    ],
    fees: [
        { type: "adult", category: "평일", price: 5000 },
        { type: "child", category: "평일", price: 3000 }
    ],
    closedDays: "매주 월요일",
    reviews: [
         { id: "r3", userId: "u3", userName: "바다사자", rating: 5, content: "국제 경기장 규격이라 넓고 좋습니다.", date: "2024-04-20" }
    ]
  },
  {
    id: "3",
    name: "대전 용운 국제수영장",
    address: "대전광역시 동구 동부로 138",
    region: "대전",
    phone: "042-280-1000",
    imageUrl: "https://picsum.photos/800/600?random=3",
    lat: 36.3351,
    lng: 127.4601,
    lanes: 10,
    length: 50,
    hasKidsPool: true,
    hasHeatedPool: false,
    hasWalkingLane: false,
    extraFeatures: "",
    freeSwimSchedule: [
        { day: "평일(월-금)", startTime: "06:00", endTime: "21:00" },
        { day: "토요일", startTime: "06:00", endTime: "18:00" }
    ],
    fees: [
        { type: "adult", category: "평일", price: 5500 },
        { type: "teen", category: "평일", price: 4500 }
    ],
    closedDays: "매월 첫째, 셋째 일요일",
    reviews: []
  },
   {
    id: "4",
    name: "탄천 종합운동장 수영장",
    address: "경기도 성남시 분당구 탄천로 215",
    region: "경기",
    phone: "031-725-7100",
    imageUrl: "https://picsum.photos/800/600?random=4",
    lat: 37.4087,
    lng: 127.1259,
    lanes: 7,
    length: 50,
    hasKidsPool: true,
    hasHeatedPool: false,
    hasWalkingLane: false,
    extraFeatures: "",
    freeSwimSchedule: [
        // 테스트를 위해 종료 시간을 09:00으로 수정함
        { day: "평일(월-금)", startTime: "06:00", endTime: "09:00" },
    ],
    fees: [
        { type: "adult", category: "평일", price: 5000 },
    ],
    closedDays: "매월 첫째, 셋째 일요일",
    reviews: [
        { id: "r4", userId: "u4", userName: "분당주민", rating: 3, content: "셔틀버스가 있어서 편해요. 샤워실이 조금 붐빕니다.", date: "2024-05-10" }
    ]
  }
];
