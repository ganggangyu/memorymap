import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 使用相对路径（./）作为 base：
//   - Capacitor Android/iOS 本地 WebView 加载（file:// / https://localhost）✅
//   - Vercel 静态部署示例（vercel.json 已配置 SPA 路由回退）✅
//   - 浏览器本地 file:// 预览 ✅
export default defineConfig({
  base: './',
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'map-vendor': ['leaflet', 'react-leaflet'],
          '3d-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          'utils-vendor': ['framer-motion', 'lucide-react', 'jszip', 'html2canvas'],
        },
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
