import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';
import type { AppDatabase } from '@/types/database';

/**
 * Client Supabase côté navigateur.
 *
 * À n'utiliser que depuis la couche `src/services/`. TD04 §13 : « Les composants
 * ne doivent jamais appeler directement Supabase. »
 */
export const createBrowserSupabaseClient = () =>
  createBrowserClient<AppDatabase>(SUPABASE_URL, SUPABASE_ANON_KEY);
