
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Netlify 환경 변수를 브라우저의 process.env로 전달
    'process.env': {
      API_KEY: JSON.stringify(process.env.API_KEY),
      SUPABASE_URL: JSON.stringify(process.env.SUPABASE_URL),
      SUPABASE_KEY: JSON.stringify(process.env.SUPABASE_KEY)
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
