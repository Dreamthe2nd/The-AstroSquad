import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, 'src/renderer'),
  base: './',
  build: {
    outDir: resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-markdown': ['react-markdown', 'remark-gfm', 'remark-math', 'rehype-katex', 'katex'],
          'vendor-jszip': ['jszip'],
          'vendor-papaparse': ['papaparse'],
          'vendor-icons': ['lucide-react'],
          'vendor-pptx': ['@extend-ai/react-pptx']
        }
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true,
  }
});
