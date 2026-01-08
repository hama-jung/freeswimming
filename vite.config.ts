
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  // Vercel은 빌드 타임에 시스템 환경 변수를 주입하므로 이를 로드합니다.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // 우선순위: .env 파일 > Vercel 시스템 환경 변수 > 기본값
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY || ""),
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL || process.env.SUPABASE_URL || ""),
      'process.env.SUPABASE_KEY': JSON.stringify(env.SUPABASE_KEY || process.env.SUPABASE_KEY || ""),
    },
    build: {
      outDir: 'dist',
      minify: true,
      sourcemap: false,
    },
    server: {
      port: 3000
    }
  };
});
