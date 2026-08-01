'use client';

import React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * Gestion du thème clair / sombre.
 *
 * LP-001 §5 impose une charte claire (fond blanc `#FFFFFF`, fond alterné
 * `#F5F7FA`) : le thème clair est donc le défaut du site public.
 *
 * Les espaces authentifiés restent en sombre indépendamment de ce réglage :
 * leurs layouts appliquent eux-mêmes la classe `dark`, ce qui garantit que les
 * variantes `dark:` des composants métier se résolvent correctement quel que
 * soit le choix du visiteur sur la vitrine.
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <NextThemesProvider
    attribute="class"
    defaultTheme="light"
    enableSystem={false}
    disableTransitionOnChange
  >
    {children}
  </NextThemesProvider>
);
