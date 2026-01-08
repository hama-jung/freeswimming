
import { GoogleGenAI, Type } from "@google/genai";
import { Pool } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * 수영장 정보 AI 3줄 요약 생성
 */
export const generatePoolSummary = async (pool: Pool): Promise<string> => {
  try {
    const prompt = `
      당신은 수영 전문가 AI 어시스턴트입니다.
      다음 수영장 정보를 바탕으로 사용자에게 도움이 될만한 3줄 요약 분석을 제공해주세요.
      각 줄은 명확한 특징이나 팁을 담아야 하며, 친근하고 전문적인 말투(해요체)를 사용하세요.

      수영장 이름: ${pool.name}
      위치: ${pool.address}
      시설: ${pool.length}m 레인 ${pool.lanes}개, 유아풀 ${pool.hasKidsPool ? '있음' : '없음'}
      자유수영 시간: ${JSON.stringify(pool.freeSwimSchedule)}
      휴무일: ${pool.closedDays}
      리뷰 요약: ${pool.reviews.length > 0 ? pool.reviews.map(r => r.content).join(' / ') : '아직 리뷰가 없습니다.'}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text?.trim() || "수영장 정보를 분석하고 있습니다.";
  } catch (error) {
    console.error("Gemini Summary Error:", error);
    return "현재 시설 정보를 분석하는 중에 잠시 문제가 발생했습니다.";
  }
};

export interface MapSearchResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

/**
 * AI를 이용한 수영장 위치 및 좌표 검색
 */
export const searchLocationWithGemini = async (query: string, userLocation?: {lat: number, lng: number}): Promise<MapSearchResult[]> => {
  try {
    // 검색어 정제
    const searchQuery = query.includes('수영장') ? query : `${query} 수영장`;
    
    // 장소 검색은 gemini-3-flash-preview가 빠르고 JSON 스키마를 잘 따릅니다.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `대한민국 내에 위치한 "${searchQuery}"에 대한 정확한 도로명 주소와 위경도 좌표(GPS)를 찾아주세요. 
      현재 사용자 위치 기준(${userLocation ? `${userLocation.lat}, ${userLocation.lng}` : "대한민국"})에서 가장 근접하고 정확한 수영장 시설 정보를 반환해야 합니다.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "시설의 정식 명칭" },
              address: { type: Type.STRING, description: "대한민국 표준 도로명 주소" },
              lat: { type: Type.NUMBER, description: "위도 (33~39 사이의 숫자)" },
              lng: { type: Type.NUMBER, description: "경도 (124~132 사이의 숫자)" }
            },
            required: ["name", "address", "lat", "lng"]
          }
        }
      },
    });

    const rawText = response.text || "[]";
    
    // 마크다운 코드 블록 등이 포함되어 있을 경우를 대비한 정제 로직
    const cleanJsonText = rawText.replace(/```json|```/g, "").trim();
    const results = JSON.parse(cleanJsonText);

    if (!Array.isArray(results)) return [];

    // 한국 지역을 벗어나는 좌표 필터링 (잘못된 데이터 방지)
    return results.filter(item => 
      item.lat >= 33 && item.lat <= 39 && 
      item.lng >= 124 && item.lng <= 132
    );
  } catch (error) {
    console.error("Gemini Location Search Error:", error);
    return [];
  }
};

/**
 * 주소 텍스트로부터 좌표 추출
 */
export const getCoordinatesFromAddress = async (address: string): Promise<{lat: number, lng: number} | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `다음 대한민국 주소의 정확한 위도(lat)와 경도(lng) 좌표를 알려주세요: "${address}"`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER }
          },
          required: ["lat", "lng"]
        }
      }
    });

    const rawText = response.text || "null";
    const cleanJsonText = rawText.replace(/```json|```/g, "").trim();
    const coords = JSON.parse(cleanJsonText);

    if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
      return coords;
    }
    return null;
  } catch (e) {
    console.error("Coordinate retrieval error:", e);
    return null;
  }
}
