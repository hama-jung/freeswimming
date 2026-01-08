
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  // Vercel은 환경 변수를 시스템 env에 직접 주입하므로, loadEnv로 이를 캡처합니다.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Vercel 빌드 타임에 사용할 변수들 우선순위 정립
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseKey = env.VITE_SUPABASE_KEY || env.SUPABASE_KEY || process.env.SUPABASE_KEY || "";
  const apiKey = env.API_KEY || process.env.API_KEY || "";

  return {
    plugins: [react()],
    define: {
      // 1. process.env 방식 지원
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.SUPABASE_KEY': JSON.stringify(supabaseKey),
      
      // 2. import.meta.env 방식 지원 (Vite 표준)
      // 주의: 빌드 엔진이 문자열 치환을 하므로 아래와 같이 정확한 키를 지정합니다.
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_KEY': JSON.stringify(supabaseKey),
    },
    build: {
      outDir: 'dist',
      minify: true,
      sourcemap: false,
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('leaflet')) return 'vendor-leaflet';
              if (id.includes('@google/genai')) return 'vendor-gemini';
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('react')) return 'vendor-react';
              return 'vendor';
            }
          }
        }
      }
    },
    server: {
      port: 3000
    }
  };
});
