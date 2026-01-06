
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
    const modelName = "gemini-3-pro-preview"; 
    
    const config = {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Official name of the facility" },
            address: { type: Type.STRING, description: "Full road address in Korea" },
            lat: { type: Type.NUMBER, description: "Latitude" },
            lng: { type: Type.NUMBER, description: "Longitude" }
          },
          required: ["name", "address", "lat", "lng"]
        }
      }
    };

    // 검색어에 '수영장'이 없는 경우 검색 품질을 위해 자동으로 추가하여 질문함
    const searchQuery = query.includes('수영장') ? query : `${query} 수영장`;
    const prompt = `Find the precise road address and GPS coordinates for "${searchQuery}" in South Korea using Google Search. 
    If the exact name is not found, suggest the most relevant public swimming pools or sports centers in that area.
    Current user approximate location for context: ${userLocation ? `${userLocation.lat}, ${userLocation.lng}` : "South Korea"}.
    Ensure the coordinates are valid numbers for the South Korea region.`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: config,
    });

    const text = response.text || "[]";
    try {
        const results = JSON.parse(text);
        if (!Array.isArray(results) || results.length === 0) {
           console.warn("Gemini Search returned no results for:", searchQuery);
        }
        return results;
    } catch (parseError) {
        console.error("JSON Parsing Error from Gemini Search:", text);
        return [];
    }
  } catch (error: any) {
    console.error("Gemini Search API Error:", error.message);
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
            contents: `Find the precise GPS coordinates (lat, lng) for this South Korean address: "${address}". 
            Respond ONLY with a JSON object: {"lat": number, "lng": number}`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "null");
    } catch (e) {
        console.error("Coordinate fetch error:", e);
        return null;
    }
}
