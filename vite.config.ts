
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  // 환경 변수 로드 (로컬의 .env 파일이나 서버의 설정값을 읽어옴)
  // process.cwd() 사용을 위해 node:process에서 import 합니다.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY),
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL || process.env.SUPABASE_URL),
      'process.env.SUPABASE_KEY': JSON.stringify(env.SUPABASE_KEY || process.env.SUPABASE_KEY),
    },
    build: {
      outDir: 'dist',
      minify: true,
      sourcemap: false,
    }
  };
});
