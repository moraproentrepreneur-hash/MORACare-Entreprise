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

  React.useEffect(() => {
    // Filet côté client ; la protection qui compte est le middleware serveur.
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

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
    // `dark` est appliqué ici, et non sur <html> : les espaces authentifiés
    // restent sombres quel que soit le thème choisi par le visiteur sur la
    // vitrine, et les variantes `dark:` des composants métier se résolvent.
    <div className="dark flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <Sidebar workspace={workspace} spaceLabel={spaceLabel} extraItems={extraItems} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {accessError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-400 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{accessError}</span>
            </div>
          )}
          {dataError && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-300 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{dataError}</span>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};
