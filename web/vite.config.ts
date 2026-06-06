import { URL, fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { devtools } from '@tanstack/devtools-vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import out from './src/.generated/output.json' with { type: 'json' };

// https://vitejs.dev/config/
export default defineConfig({
  base: out.baseRoute,
  plugins: [
    devtools(),
    viteReact({
      babel: {
        plugins: ['babel-plugin-react-compiler']
      }
    }),
    tailwindcss()
  ],
  root: fileURLToPath(new URL('.', import.meta.url)),
  build: {
    outDir: out.outDir || "dist"
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
});
