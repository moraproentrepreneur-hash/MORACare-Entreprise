import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from './config';
import type { AppDatabase } from '@/types/database';

/**
 * Client d'administration Supabase.
 *
 * Utilise la clé `service_role`, qui contourne toutes les politiques RLS.
 * L'import de `server-only` garantit qu'une inclusion accidentelle depuis un
 * composant client provoque une erreur de compilation plutôt qu'une fuite de
 * la clé dans le bundle.
 *
 * À n'utiliser que dans les Route Handlers, après avoir vérifié soi-même les
 * droits de l'appelant : ce client ne vérifie plus rien.
 */
export const createAdminSupabaseClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey || serviceRoleKey.includes('mock')) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY n'est pas configurée : la création de comptes est impossible.",
    );
  }

  return createClient<AppDatabase>(SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};
