import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // PGlite démarre un moteur PostgreSQL WebAssembly par suite : le temps de
    // chargement dépasse largement le défaut de 5 s.
    testTimeout: 60_000,
    hookTimeout: 120_000,
    // Chaque fichier ouvre sa propre base ; les exécuter en parallèle
    // saturerait la mémoire.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
});
