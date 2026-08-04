'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useAccess } from '@/context/AccessContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { AccountGate } from '@/components/auth/AccountGate';
import { getModuleRoute } from '@/lib/navigation';

interface WorkspaceLayoutProps {
  workspace: 'establishment' | 'platform' | 'portal';
  spaceLabel: string;
  extraItems?: readonly { label: string; href: string; icon: React.ElementType }[];
  children: React.ReactNode;
}

/**
 * Ossature commune aux espaces authentifiés (TD04 §10).
 *
 * Les espaces restent distincts : chacun lui passe son propre périmètre de
 * référentiel et son propre libellé, et aucun n'a connaissance de l'autre.
 *
 * Sous 1024 px, le menu latéral devient un tiroir : conserver une colonne de
 * 256 px sur un téléphone ne laisserait pas assez de place au contenu.
 */
export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  workspace,
  spaceLabel,
  extraItems,
  children,
}) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { error: dataError } = useData();
  const { error: accessError, isLoading: accessLoading } = useAccess();
  const { visibleModules } = usePermissions();
  const pathname = usePathname();
  const router = useRouter();

  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  React.useEffect(() => {
    // Filet côté client ; la protection qui compte est le middleware serveur.
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Le tiroir se referme à chaque changement de page : le laisser ouvert
  // masquerait l'écran que l'on vient d'ouvrir.
  React.useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!isMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isMenuOpen]);

  const title = React.useMemo(() => {
    const custom = extraItems?.find((item) => pathname === item.href);
    if (custom) return custom.label;

    const match = visibleModules
      .map((module) => ({ module, route: getModuleRoute(module.code) }))
      .filter(({ route }) => route && (pathname === route.href || pathname.startsWith(`${route.href}/`)))
      .sort((a, b) => (b.route?.href.length ?? 0) - (a.route?.href.length ?? 0))[0];

    return match?.module.name ?? 'MORACare';
  }, [pathname, visibleModules, extraItems]);

  if (authLoading || accessLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-mora-blue border-t-mora-green animate-spin" />
        <p className="text-xs font-mono text-slate-400">Chargement de MORACare…</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    /*
      `AccountGate` enveloppe l'ossature entière, et non le seul contenu : tant
      qu'un compte doit être activé ou son mot de passe remplacé, ni le menu ni
      les tableaux de bord ne sont montés — donc aucune donnée métier n'est
      chargée.
    */
    <AccountGate>
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Colonne fixe à partir de 1024 px */}
      <div className="hidden lg:flex">
        <Sidebar workspace={workspace} spaceLabel={spaceLabel} extraItems={extraItems} />
      </div>

      {/* Tiroir mobile */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 max-w-[85vw] shadow-2xl">
            <Sidebar
              workspace={workspace}
              spaceLabel={spaceLabel}
              extraItems={extraItems}
              onNavigate={() => setIsMenuOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header title={title} onOpenMenu={() => setIsMenuOpen(true)} />
        <main className="flex-1 space-y-6 overflow-y-auto p-3 sm:p-4 lg:p-6">
          {accessError && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{accessError}</span>
            </div>
          )}
          {dataError && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{dataError}</span>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
    </AccountGate>
  );
};
