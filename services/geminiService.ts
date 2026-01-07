
import { GoogleGenAI, Type } from "@google/genai";
import { Pool } from "../types";

// API 키가 없을 경우를 대비한 안전한 초기화 함수
// Fix: Use the correct initialization pattern for @google/genai
const getAi = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("Gemini API Key is missing. Please set it in your environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generatePoolSummary = async (pool: Pool): Promise<string> => {
  try {
    const ai = getAi();
    if (!ai) return "AI 분석 기능을 사용하려면 API 키 설정이 필요합니다.";

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

    // Fix: Use ai.models.generateContent directly and model 'gemini-3-flash-preview'
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    // Fix: Access response.text directly (property, not method)
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
    if (!ai) return [];

    // Fix: Use recommended model for complex tasks
    const modelName = "gemini-3-pro-preview"; 
    
    // Fix: Use correct search grounding configuration
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

    const searchQuery = query.includes('수영장') ? query : `${query} 수영장`;
    const prompt = `Find the precise road address and GPS coordinates for "${searchQuery}" in South Korea using Google Search. 
    If the exact name is not found, suggest the most relevant public swimming pools or sports centers in that area.
    Current user approximate location for context: ${userLocation ? `${userLocation.lat}, ${userLocation.lng}` : "South Korea"}.
    Ensure the coordinates are valid numbers for the South Korea region.`;

    // Fix: Use ai.models.generateContent with correctly defined model and config
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: config,
    });

    // Fix: Access response.text as a property
    const text = response.text || "[]";
    try {
        const results = JSON.parse(text);
        return Array.isArray(results) ? results : [];
    } catch (parseError) {
        console.error("JSON Parsing Error from Gemini Search:", text);
        return [];
    }
  } catch (error: any) {
    console.error("Gemini Search API Error:", error.message);
    return [];
  }
};

export const getCoordinatesFromAddress = async (address: string): Promise<{lat: number, lng: number} | null> => {
    try {
        const ai = getAi();
        if (!ai) return null;

        // Fix: Use gemini-3-flash-preview and property access for .text
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
