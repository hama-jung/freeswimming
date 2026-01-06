
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL),
    'process.env.SUPABASE_KEY': JSON.stringify(process.env.SUPABASE_KEY),
  },
  build: {
    outDir: 'dist',
    minify: true, // 기본 esbuild 사용 (terser 설치 불필요)
    sourcemap: false,
  }
});
