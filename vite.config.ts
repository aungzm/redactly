import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { crx } from '@crxjs/vite-plugin';
import fs from 'fs';
import { unlinkSync } from 'fs';

// Determine which browser we're building for
const browser = process.env.BROWSER || 'chrome';
const manifestPath = resolve(__dirname, `./public/manifest.${browser}.json`);

// Read the appropriate manifest
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
    {
      name: 'cleanup-manifests',
      apply: 'build',
      closeBundle() {
        // Remove unwanted manifest files from dist
        const distDir = resolve(__dirname, `dist/${browser}`);
        const filesToRemove = [
          'manifest.base.json',
          'manifest.chrome.json',
          'manifest.firefox.json',
        ];
        
        filesToRemove.forEach(file => {
          const filePath = resolve(distDir, file);
          try {
            if (fs.existsSync(filePath)) {
              unlinkSync(filePath);
              console.log(`✓ Removed ${file}`);
            }
          } catch (err) {
            console.warn(`Warning: Could not remove ${file}:`, err);
          }
        });
      }
    }
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@types': resolve(__dirname, './src/types'),
    },
  },
  build: {
    outDir: `dist/${browser}`,
    sourcemap: process.env.NODE_ENV !== 'production',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
      },
    },
  },
});
