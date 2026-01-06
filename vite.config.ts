
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite Configuration for Netlify Deployment
 * Updated: 2025-01-06
 */
export default defineConfig({
  plugins: [react()],
  define: {
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
