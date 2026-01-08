
# 🏊‍♂️ 자유수영.kr - 전국 수영장 정보 서비스

전국 수영장의 자유수영 시간, 요금, 휴무일 정보를 공유하고 AI 분석을 통해 정보를 제공하는 웹 어플리케이션입니다.

## 🚀 배포 정보
- **GitHub Repository**: [hama-jung/freeswimming](https://github.com/hama-jung/freeswimming)
- **Vercel 배포 방법**:
  1. [Vercel](https://vercel.com) 로그인 후 **Add New Project** 클릭
  2. GitHub 저장소 `hama-jung/freeswimming` 연결
  3. **Environment Variables** 설정:
     - `API_KEY`: Google Gemini API Key
     - `SUPABASE_URL`: Supabase URL
     - `SUPABASE_KEY`: Supabase Anon Key
  4. **Deploy** 클릭

## ⚙️ 주요 기능
- 전국 수영장 지도 기반 검색 (Leaflet)
- 실시간 이용 가능 여부 확인
- Gemini AI 기반 수영장 정보 요약 및 장소 검색
- Supabase 기반 실시간 데이터 동기화

## 🛠 관리 가이드
- **데이터 수정**: 수영장 상세 페이지에서 '수정' 버튼을 통해 정보를 최신화할 수 있습니다.
- **AI 검색**: 수영장 등록 시 'AI 검색'을 활용하면 Gemini가 주소와 좌표를 자동으로 찾아줍니다.
