// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: { exclude: ['better-sqlite3'] },
    ssr: { external: ['better-sqlite3'] },
    server: {
      allowedHosts: true,
    },
  },
  server: {
    host: '0.0.0.0',
  },
  adapter: node({ mode: 'standalone' }),
});
