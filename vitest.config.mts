import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    // Les suites de base de données tournent sous Node ; les suites de
    // composants déclarent `@vitest-environment jsdom` en tête de fichier.
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // PGlite démarre un moteur PostgreSQL WebAssembly par suite : le temps de
    // chargement dépasse largement le défaut de 5 s.
    testTimeout: 60_000,
    hookTimeout: 120_000,
    // Chaque fichier ouvre sa propre base ; les exécuter en parallèle
    // saturerait la mémoire.
    fileParallelism: false,
  },
  // `tsconfig.json` laisse le JSX intact (`preserve`) : c'est Next.js qui le
  // compile. Hors de Next.js, il faut le compiler ici.
  oxc: { jsx: 'automatic' },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
});
