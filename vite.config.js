import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 100000000, // 100MB - inlines all assets
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    }
  }
});
