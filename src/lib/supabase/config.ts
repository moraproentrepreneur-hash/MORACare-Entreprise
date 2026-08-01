/**
 * Configuration Supabase partagée (TD05).
 *
 * Le projet est livré avec des valeurs factices dans .env.local. Les détecter
 * explicitement évite le mode de panne le plus coûteux : une application qui
 * se charge, n'affiche aucune erreur, et reste désespérément vide.
 */

const PLACEHOLDER_MARKERS = ['mock-', 'mock.', 'your-', 'placeholder', 'example.com', 'changeme'];

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const looksLikePlaceholder = (value: string): boolean => {
  const normalized = value.toLowerCase();
  return PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker));
};

/**
 * Vrai uniquement si les deux variables sont présentes et ne ressemblent pas
 * à des valeurs de démonstration.
 */
export const isSupabaseConfigured = (): boolean => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  if (looksLikePlaceholder(SUPABASE_URL) || looksLikePlaceholder(SUPABASE_ANON_KEY)) return false;
  return SUPABASE_URL.startsWith('http');
};

export const SUPABASE_SETUP_MESSAGE =
  "Supabase n'est pas configuré. Renseignez NEXT_PUBLIC_SUPABASE_URL et " +
  'NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local avec les valeurs de votre projet, ' +
  'puis appliquez les migrations du dossier supabase/migrations.';
