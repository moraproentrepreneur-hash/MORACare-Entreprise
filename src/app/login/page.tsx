'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/context/AuthContext';

/**
 * Écran de connexion (AuthLayout, TD04 §10).
 *
 * La redirection après connexion dépend du rôle : le middleware serveur est
 * l'autorité, mais on l'anticipe ici pour éviter un aller-retour visible.
 */
export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    if (user.role === 'super_admin') router.replace('/admin');
    else if (user.role === 'patient') router.replace('/portail');
    else router.replace('/dashboard');
  }, [isAuthenticated, user, router]);

  return <LoginForm onBackToLanding={() => router.push('/')} />;
}
