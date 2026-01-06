
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

    // Use Gemini 3 Flash for faster and accurate results
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `"${query}" 수영장의 정보를 구글 지도에서 검색해서 다음 JSON 형식으로만 답변하세요. 다른 설명은 하지 마세요. 
      형식: [{"name": "이름", "address": "도로명주소", "lat": 위도숫자, "lng": 경도숫자, "uri": "구글지도URL"}]`,
      config: config,
    });

    const text = response.text || "[]";
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Maps Grounding Error:", error);
    return [];
  }
};
