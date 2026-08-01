import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';
import type { AppDatabase } from '@/types/database';

/**
 * Client Supabase côté serveur (Server Components, Route Handlers, Server Actions).
 *
 * C'est ce client qui permet le contrôle d'accès côté serveur exigé par
 * TD06 §7 et BP06 §14 : la sécurité ne doit jamais dépendre du Frontend.
 */
export const createServerSupabaseClient = () => {
  const cookieStore = cookies();

  return createServerClient<AppDatabase>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Appelé depuis un Server Component : le rafraîchissement des cookies
          // est assuré par le middleware, cette erreur est donc sans conséquence.
        }
      },
    },
  });
};
