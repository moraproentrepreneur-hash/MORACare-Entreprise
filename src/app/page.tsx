'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LandingPage } from '@/components/landing/LandingPage';

/**
 * Landing Page publique (LP-001).
 *
 * CLAUDE.md § Architecture attendue : « Accessible uniquement aux visiteurs.
 * Aucune fonctionnalité interne. » Cette page ne lit aucune donnée métier.
 */
export default function Home() {
  const router = useRouter();
  return <LandingPage onGoToLogin={() => router.push('/login')} />;
}
