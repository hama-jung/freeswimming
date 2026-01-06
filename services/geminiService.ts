
import { GoogleGenAI, Type } from "@google/genai";
import { Pool } from "../types";

// Always use process.env.API_KEY directly for initialization.
const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    console.error("Gemini API Error (Summary):", error);
    return "AI 서비스 연결 상태가 좋지 않아 분석을 완료할 수 없습니다.";
  }
};

export interface MapSearchResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export const searchLocationWithGemini = async (query: string, userLocation?: {lat: number, lng: number}): Promise<MapSearchResult[]> => {
  try {
    const ai = getAi();
    const modelName = "gemini-3-pro-preview"; // 좌표 추출 정확도를 위해 Pro 모델 권장
    
    const config = {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Official swimming pool name" },
            address: { type: Type.STRING, description: "Full road address in Korea" },
            lat: { type: Type.NUMBER, description: "Latitude coordinate" },
            lng: { type: Type.NUMBER, description: "Longitude coordinate" }
          },
          required: ["name", "address", "lat", "lng"]
        }
      }
    };

    const prompt = `Find the exact road address and GPS coordinates (latitude, longitude) of "${query}" swimming pool in South Korea. 
    Current user location is approx: ${userLocation ? `${userLocation.lat}, ${userLocation.lng}` : "unknown"}. 
    Provide real coordinates, not placeholders.`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: config,
    });

    const results = JSON.parse(response.text || "[]");
    return results;
  } catch (error: any) {
    console.error("Gemini Search Error:", error.message);
    return [];
  }
};

/**
 * 특정 주소에 대한 좌표를 가져오는 함수
 */
export const getCoordinatesFromAddress = async (address: string): Promise<{lat: number, lng: number} | null> => {
    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Find the GPS coordinates (lat, lng) for the following address in South Korea: "${address}". 
            Respond ONLY with a JSON object: {"lat": number, "lng": number}`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "null");
    } catch (e) {
        console.error("Coordinate fetch error:", e);
        return null;
    }
}
