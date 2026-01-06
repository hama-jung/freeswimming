
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
    console.error("Gemini API Error (Summary):", error);
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
    // 검색 기능을 가장 잘 지원하는 2.5 flash 모델 사용
    const modelName = "gemini-2.5-flash";
    
    console.log(`Searching for "${query}" swimming pool...`);

    // 스크린샷에서 활성화가 확인된 googleSearch 도구 사용
    const config: any = {
      tools: [{ googleSearch: {} }],
    };

    const response = await ai.models.generateContent({
      model: modelName,
      contents: `Find the official name and exact road address of "${query}" swimming pool in South Korea. 
      I need the information to register it in my app. 
      Please answer in this format: "NAME: [Pool Name], ADDRESS: [Full Road Address]"`,
      config: config,
    });

    console.log("Raw Search Response:", response.text);

    const results: MapSearchResult[] = [];
    const text = response.text || "";

    // 1. 텍스트에서 정보 추출 (가장 확실한 방법)
    const nameMatch = text.match(/NAME:\s*([^\n,]+)/i);
    const addressMatch = text.match(/ADDRESS:\s*([^\n.]+)/i);

    if (nameMatch && addressMatch) {
      results.push({
        name: nameMatch[1].trim(),
        address: addressMatch[1].trim(),
        lat: userLocation?.lat || 37.5665,
        lng: userLocation?.lng || 126.9780
      });
    } else if (text.length > 10) {
      // 형식이 안 맞아도 텍스트가 있으면 첫 줄을 이름, 나머지를 주소로 추측
      const lines = text.split('\n').filter(l => l.trim());
      results.push({
        name: lines[0].replace(/NAME:|ADDRESS:/gi, '').trim(),
        address: (lines[1] || lines[0]).replace(/NAME:|ADDRESS:/gi, '').trim(),
        lat: userLocation?.lat || 37.5665,
        lng: userLocation?.lng || 126.9780
      });
    }

    // 2. 검색 결과 출처(Sources)가 있다면 로그에 남김 (사용자 디버깅용)
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata?.groundingChunks) {
      console.log("Grounding Sources found:", groundingMetadata.groundingChunks);
    }

    return results;
  } catch (error: any) {
    console.error("Gemini Search Error:", error.message);
    return [];
  }
};
