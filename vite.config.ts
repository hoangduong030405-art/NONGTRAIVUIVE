import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1400, // Phaser is a single ~1.2 MB (330 kB gz) vendor chunk, cached by the SW
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          react: ['react', 'react-dom', 'zustand', 'mitt', 'dexie', 'lucide-react'],
        },
      },
    },
  },
});
