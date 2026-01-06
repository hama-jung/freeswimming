
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
      contents: `${query} 수영장의 이름, 정확한 도로명 주소, 그리고 위도와 경도 좌표 정보를 구글 지도 데이터를 참조하여 알려주세요.`,
      config: config,
    });

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const groundingChunks = groundingMetadata?.groundingChunks;
    
    // 1. 구글 지도 도구의 직접적인 응답(chunks)이 있는 경우
    if (groundingChunks && Array.isArray(groundingChunks)) {
      const results = groundingChunks
        .filter((chunk: any) => chunk.maps) // maps 데이터가 있는 청크만 필터링
        .map((chunk: any) => ({
          name: chunk.maps.title || query,
          address: chunk.maps.address || "주소 정보 없음",
          // 지도 정보가 없을 경우 사용자의 현재 위치나 기본 서울 좌표 사용
          lat: userLocation?.lat || 37.5665,
          lng: userLocation?.lng || 126.9780,
          uri: chunk.maps.uri
        }));

      if (results.length > 0) return results;
    }

    // 2. 직접적인 청크는 없지만 텍스트 응답이 있는 경우 (AI의 지식 활용)
    const text = response.text || "";
    if (text.length > 10) {
      return [{
        name: query,
        address: text.split('\n')[0].substring(0, 100), // 텍스트 첫 줄을 주소로 가정
        lat: userLocation?.lat || 37.5665,
        lng: userLocation?.lng || 126.9780
      }];
    }

    return [];
  } catch (error) {
    console.error("Maps Grounding Error:", error);
    // 에러 발생 시 빈 배열 반환하여 컴포넌트에서 경고창을 띄우게 함
    return [];
  }
};
