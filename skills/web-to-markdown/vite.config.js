import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'web-to-markdown.mjs'),
      name: 'WebToMarkdown',
      fileName: 'web-to-markdown',
      formats: ['es']
    },
    rollupOptions: {
      external: ['http', 'https', 'fs', 'path', 'url', 'puppeteer']
    }
  }
});
