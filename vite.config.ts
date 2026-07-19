import process from 'node:process';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export function normalizeBasePath(value: string) {
  const path = value.trim().replace(/^\/+|\/+$/g, '');

  return path ? `/${path}/` : '/';
}

export function resolveBasePath(env: NodeJS.ProcessEnv = process.env) {
  if (env.VITE_BASE_PATH !== undefined) {
    return normalizeBasePath(env.VITE_BASE_PATH);
  }

  const repositoryName = env.GITHUB_REPOSITORY?.split('/').filter(Boolean).at(-1);

  if (!repositoryName || repositoryName.toLowerCase().endsWith('.github.io')) {
    return '/';
  }

  return normalizeBasePath(repositoryName);
}

const base = resolveBasePath();

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeManifestIcons: false,
      manifest: {
        id: base,
        name: 'Ночной город / Последний бункер',
        short_name: 'Игры ведущего',
        description: 'Две атмосферные социальные игры для компании на одном устройстве.',
        lang: 'ru',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#05070a',
        theme_color: '#090a0d',
        categories: ['games', 'entertainment'],
        icons: [
          {
            src: `${base}icons/app-icon-192.png`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: `${base}icons/app-icon-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: `${base}icons/app-icon-maskable-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,jpg,png,woff2}'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
});
