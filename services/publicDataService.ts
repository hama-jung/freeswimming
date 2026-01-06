import { Pool, FreeSwimSchedule, FeeInfo } from '../types';

const API_BASE_URL = 'https://api.data.go.kr/openapi/tn_pubr_public_swimming_pool_api';

// Helper to map address to region short names
const mapAddressToRegion = (address: string): string => {
  if (!address) return "기타";
  if (address.includes("서울")) return "서울";
  if (address.includes("경기")) return "경기";
  if (address.includes("인천")) return "인천";
  if (address.includes("부산")) return "부산";
  if (address.includes("대구")) return "대구";
  if (address.includes("광주")) return "광주";
  if (address.includes("대전")) return "대전";
  if (address.includes("울산")) return "울산";
  if (address.includes("세종")) return "충남"; // 세종은 편의상 충남권 또는 별도 처리
  if (address.includes("강원")) return "강원";
  if (address.includes("경남") || address.includes("경상남도")) return "경남";
  if (address.includes("경북") || address.includes("경상북도")) return "경북";
  if (address.includes("전남") || address.includes("전라남도")) return "전남";
  if (address.includes("전북") || address.includes("전라북도")) return "전북";
  if (address.includes("충남") || address.includes("충청남도")) return "충남";
  if (address.includes("충북") || address.includes("충청북도")) return "충북";
  if (address.includes("제주")) return "제주";
  return "기타";
};

export const fetchPoolsFromPublicApi = async (apiKey: string): Promise<Pool[]> => {
  try {
    // 공공데이터포털 API 호출
    // type=json, pageNo=1, numOfRows=100 (데모용 100개 제한)
    // serviceKey는 이미 인코딩된 키일 수도 있고 아닐 수도 있으므로, URL에 직접 붙이는 방식을 시도합니다.
    const url = `${API_BASE_URL}?serviceKey=${apiKey}&pageNo=1&numOfRows=100&type=json`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API 호출 실패: ${response.status}`);
    }

    const data = await response.json();
    
    // 응답 구조 확인 (공공데이터 표준 형식)
    const items = data.response?.body?.items;
    
    if (!items || !Array.isArray(items)) {
      console.warn("API 데이터 형식이 올바르지 않거나 데이터가 없습니다.", data);
      return [];
    }

    return items.map((item: any, index: number) => {
        // 데이터 매핑
        const freeSwimSchedule: FreeSwimSchedule[] = [];
        
        // 평일
        if (item.weekdayOperOpenHhmm && item.weekdayOperColseHhmm) {
            freeSwimSchedule.push({
                // Fix: Changed "평일" to "평일(월-금)" to match DayType
                day: "평일(월-금)",
                startTime: item.weekdayOperOpenHhmm,
                endTime: item.weekdayOperColseHhmm
            });
        }
        // 토요일
        if (item.satOperOpenHhmm && item.satOperColseHhmm) {
            freeSwimSchedule.push({
                day: "토요일",
                startTime: item.satOperOpenHhmm,
                endTime: item.satOperColseHhmm
            });
        }
        // 공휴일
        if (item.holidayOperOpenHhmm && item.holidayOperColseHhmm) {
            freeSwimSchedule.push({
                day: "공휴일",
                startTime: item.holidayOperOpenHhmm,
                endTime: item.holidayOperColseHhmm
            });
        }

        // 요금 정보
        const fees: FeeInfo[] = [];
        // Fix: Added missing 'category' property to match FeeInfo
        if (item.adultEntryCost) fees.push({ type: 'adult', category: '평일', price: Number(item.adultEntryCost) });
        if (item.teenEntryCost) fees.push({ type: 'teen', category: '평일', price: Number(item.teenEntryCost) });
        if (item.childEntryCost) fees.push({ type: 'child', category: '평일', price: Number(item.childEntryCost) });

        return {
            id: `api-${index}-${Date.now()}`,
            name: item.fcltyNm,
            address: item.rdnmadr || item.lnmadr || "주소 미상",
            region: mapAddressToRegion(item.rdnmadr || item.lnmadr),
            phone: item.phoneNumber || "전화번호 없음",
            // 이미지는 API에서 제공하지 않으므로 랜덤 이미지 사용
            imageUrl: `https://picsum.photos/800/600?random=${index + 100}`,
            lat: Number(item.latitude) || 37.5665,
            lng: Number(item.longitude) || 126.9780,
            
            // 상세 정보 매핑 (없을 경우 기본값)
            lanes: Number(item.laneLen) || 25, 
            length: Number(item.laneLen) || 25,
            hasKidsPool: false, // API 제공 항목 아님
            // Fix: Added missing properties required by Pool interface
            hasHeatedPool: false,
            hasWalkingLane: false,
            extraFeatures: "",

            freeSwimSchedule,
            fees,
            closedDays: item.rstdeInfo || "정보 없음",
            reviews: [] // 초기 리뷰 없음
        };
    });

  } catch (error) {
    console.error("공공데이터 API 연동 오류:", error);
    // 에러를 던져서 호출자가 알 수 있게 함
    throw error;
  }
};