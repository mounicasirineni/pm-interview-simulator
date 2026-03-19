import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    include: ['es-toolkit', 'es-toolkit/compat'],
  },
});
