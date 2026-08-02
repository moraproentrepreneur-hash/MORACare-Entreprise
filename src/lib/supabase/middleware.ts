import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './config';
import type { AppDatabase } from '@/types/database';
import type { UserRole } from '@/types';

/**
 * Rafraîchissement de session ET contrôle d'accès aux espaces.
 *
 * BP06 §14 et TD06 §7 exigent que le contrôle d'accès soit appliqué côté
 * serveur. C'est ici que se joue la séparation des espaces exigée par
 * CLAUDE.md, avant même que la moindre page ne soit rendue.
 *
 * Rappel : ce middleware décide de la *navigation*. Il ne protège pas les
 * données — c'est le rôle des politiques RLS de PostgreSQL.
 */

/** Routes accessibles sans authentification. */
const PUBLIC_PATHS = ['/', '/login'];

/** Préfixes d'URL de chaque espace. */
const ADMIN_PREFIX = '/admin';
const PORTAL_PREFIX = '/portail';

/** Espace d'accueil de chaque rôle (BP06 §10 bis). */
const homeForRole = (role: UserRole): string => {
  if (role === 'super_admin') return ADMIN_PREFIX;
  if (role === 'patient') return PORTAL_PREFIX;
  return '/dashboard';
};

const isPublicPath = (pathname: string): boolean =>
  PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/api/');

export const updateSession = async (request: NextRequest): Promise<NextResponse> => {
  let response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  /**
   * Configuration absente : on refuse l'accès aux routes privées.
   *
   * Une version antérieure laissait passer, au motif que l'interface afficherait
   * une bannière explicative. C'était une erreur : un déploiement mal configuré
   * rendait alors `/dashboard`, `/admin` et tous les écrans internes atteignables
   * sans session. Aucune donnée n'en sortait — faute de base — mais l'application
   * ne doit pas s'ouvrir parce qu'elle est cassée.
   *
   * Le visiteur est renvoyé vers la page de connexion, qui explique la cause.
   */
  if (!isSupabaseConfigured()) {
    if (isPublicPath(pathname)) return response;

    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  const supabase = createServerClient<AppDatabase>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() revalide le jeton auprès de Supabase. Ne jamais s'appuyer sur
  // getSession() côté serveur : son contenu provient du cookie, donc du client.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = '';
    return NextResponse.redirect(url);
  };

  if (!user) {
    // Route privée sans session : retour à la connexion.
    return isPublicPath(pathname) ? response : redirectTo('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  // Compte authentifié mais sans profil actif : aucun espace ne lui est ouvert.
  if (!profile || profile.is_active === false) {
    if (pathname === '/login' || pathname === '/') return response;
    return redirectTo('/login');
  }

  const role = profile.role as UserRole;
  const home = homeForRole(role);

  // Un utilisateur connecté n'a rien à faire sur l'écran de connexion.
  if (pathname === '/login') {
    return redirectTo(home);
  }

  // La landing page reste consultable par tous : c'est une vitrine publique.
  if (pathname === '/') {
    return response;
  }

  const wantsAdmin = pathname.startsWith(ADMIN_PREFIX);
  const wantsPortal = pathname.startsWith(PORTAL_PREFIX);

  // BP06 §10 bis : l'espace SaaS est réservé au Super Admin…
  if (wantsAdmin && role !== 'super_admin') {
    return redirectTo(home);
  }

  // …et réciproquement, il n'accède à aucun espace clinique.
  if (!wantsAdmin && role === 'super_admin') {
    return redirectTo(ADMIN_PREFIX);
  }

  // Le patient ne dispose que de son portail (BP29).
  if (role === 'patient' && !wantsPortal) {
    return redirectTo(PORTAL_PREFIX);
  }

  if (wantsPortal && role !== 'patient') {
    return redirectTo(home);
  }

  return response;
};
