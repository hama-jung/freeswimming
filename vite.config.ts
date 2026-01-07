
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // 환경 변수 로드 (로컬의 .env 파일이나 서버의 설정값을 읽어옴)
  // Fix: Ensure process.cwd() is used correctly. 
  // Depending on the environment, you might need to import 'process' or use global process.
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
