'use client';

import { BillingConsole } from '@/components/billing/BillingConsole';

/**
 * Finances des abonnements (BP30).
 *
 * Réservé au Super Admin : le middleware refuse l'espace `/admin` aux autres
 * rôles avant tout rendu, et les politiques RLS n'ouvrent l'écriture des
 * factures qu'à l'éditeur.
 */
export default function BillingPage() {
  return <BillingConsole />;
}
