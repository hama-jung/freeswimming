
import { GoogleGenAI, Type } from "@google/genai";
import { Pool } from "../types";

const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generatePoolSummary = async (pool: Pool): Promise<string> => {
  try {
    const ai = getAi();
    const prompt = `
      당신은 수영 전문가 AI 어시스턴트입니다.
      다음 수영장 정보를 바탕으로 사용자에게 도움이 될만한 3줄 요약 분석을 제공해주세요.
      친근하고 전문적인 말투(해요체)를 사용하세요.

      수영장 이름: ${pool.name}
      위치: ${pool.address}
      시설: ${pool.length}m 레인 ${pool.lanes}개, 유아풀 ${pool.hasKidsPool ? '있음' : '음'}
      자유수영 시간: ${JSON.stringify(pool.freeSwimSchedule)}
      휴무일: ${pool.closedDays}
      리뷰 내용: ${pool.reviews.map(r => r.content).join(' / ')}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "AI 분석을 불러올 수 없습니다.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI 서비스 연결 상태가 좋지 않아 분석을 완료할 수 없습니다.";
  }
};

export interface MapSearchResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  uri?: string;
}

export const searchLocationWithGemini = async (query: string, userLocation?: {lat: number, lng: number}): Promise<MapSearchResult[]> => {
  try {
    const ai = getAi();
    // Maps Grounding은 Gemini 2.5 시리즈에서만 지원됩니다.
    const modelName = "gemini-2.5-flash";
    
    const config: any = {
      tools: [{ googleMaps: {} }],
    };

    if (userLocation) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: userLocation.lat,
            longitude: userLocation.lng
          }
        }
      };
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: `${query} 수영장 정보를 구글 지도에서 찾아서 이름, 주소, 좌표 정보를 알려주세요.`,
      config: config,
    });

    // GroundingMetadata에서 직접 정보 추출 시도
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (groundingChunks && groundingChunks.length > 0) {
      return groundingChunks.map((chunk: any) => ({
        name: chunk.maps?.title || query,
        address: chunk.maps?.address || "주소 정보 없음",
        // 좌표 정보가 chunk에 없을 경우 텍스트 응답에서 파싱하거나 기본값 사용
        lat: userLocation?.lat || 37.5665,
        lng: userLocation?.lng || 126.9780,
        uri: chunk.maps?.uri
      }));
    }

    // GroundingMetadata가 없을 경우 텍스트 응답 파싱 (Fallback)
    // 주의: Maps Grounding 사용 시 response.text가 JSON이 아닐 가능성이 높음
    const text = response.text || "";
    console.log("Gemini Response Text:", text);
    
    // 단순 검색 결과 반환 (데모용 Fallback 로직)
    return [{
      name: query,
      address: "검색 결과 본문을 확인해 주세요.",
      lat: userLocation?.lat || 37.5665,
      lng: userLocation?.lng || 126.9780
    }];

  } catch (error) {
    console.error("Maps Grounding Error:", error);
    return [];
  }
};
