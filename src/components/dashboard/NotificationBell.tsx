'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  CreditCard,
  Info,
  Inbox,
  KeyRound,
  MessagesSquare,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAccess } from '@/context/AccessContext';
import {
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadCount,
  type AppNotification,
  type NotificationSource,
} from '@/services/notification.service';

/**
 * Cloche de notifications et panneau associé.
 *
 * Le panneau se recharge à chaque ouverture : la plupart des alertes sont des
 * états de la base — une demande sans réponse, une échéance proche — et non des
 * messages figés. Les afficher tels qu'ils étaient au chargement de la page
 * reviendrait à mentir dès la première minute.
 *
 * Sur mobile, le panneau occupe la largeur de l'écran plutôt qu'une colonne
 * flottante coupée par le bord droit.
 */

const SOURCE_ICONS: Record<NotificationSource, React.ElementType> = {
  system: Info,
  registration: Inbox,
  contact: MessagesSquare,
  subscription: CreditCard,
  license: KeyRound,
};

const SEVERITY_TONES = {
  info: 'text-mora-green',
  warning: 'text-amber-400',
  critical: 'text-red-400',
} as const;

const formatMoment = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (minutes < 1440) return `Il y a ${Math.floor(minutes / 60)} h`;

  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const { snapshot } = useAccess();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const subscription = snapshot?.subscription ?? null;
  const license = snapshot?.license ?? null;

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      setItems(await loadNotifications({ userId: user.id, role: user.role, subscription, license }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    } finally {
      setIsLoading(false);
    }
  }, [user, subscription, license]);

  // Premier chargement : la pastille doit être juste avant toute ouverture.
  useEffect(() => {
    void load();
  }, [load]);

  // Fermeture au clic extérieur et à Échap : un panneau flottant qui reste
  // ouvert masque le contenu de la page.
  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) void load();
  };

  const handleClick = async (item: AppNotification) => {
    if (item.rowId && !item.isRead) {
      try {
        await markNotificationRead(item.rowId);
        setItems((list) =>
          list.map((entry) => (entry.id === item.id ? { ...entry, isRead: true } : entry)),
        );
      } catch {
        // Marquer comme lu est secondaire : ne jamais empêcher la navigation.
      }
    }
    if (item.href) {
      setIsOpen(false);
      router.push(item.href);
    }
  };

  const handleMarkAll = async () => {
    if (!user) return;
    try {
      await markAllNotificationsRead(user.id);
      setItems((list) => list.map((entry) => ({ ...entry, isRead: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible.');
    }
  };

  const unread = unreadCount(items);
  const hasSystemUnread = items.some((item) => item.rowId && !item.isRead);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={unread > 0 ? `Notifications, ${unread} non lues` : 'Notifications'}
        className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-mora-green px-1 text-[9px] font-black text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="fixed inset-x-3 top-16 z-50 max-h-[70vh] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-white">Notifications</p>
              <p className="text-[11px] text-slate-400">
                {unread > 0 ? `${unread} à traiter` : 'Rien à signaler'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {hasSystemUnread && (
                <button
                  type="button"
                  onClick={() => void handleMarkAll()}
                  title="Tout marquer comme lu"
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Fermer"
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[calc(70vh-4rem)] overflow-y-auto sm:max-h-96">
            {isLoading && (
              <p className="px-4 py-8 text-center text-xs text-slate-500">Chargement…</p>
            )}

            {error && (
              <p className="m-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                {error}
              </p>
            )}

            {!isLoading && !error && items.length === 0 && (
              <div className="px-4 py-10 text-center">
                <Bell className="mx-auto h-8 w-8 text-slate-700" />
                <p className="mt-3 text-xs text-slate-500">
                  Aucune notification. Les demandes, messages et échéances
                  apparaîtront ici.
                </p>
              </div>
            )}

            <ul className="divide-y divide-slate-800">
              {items.map((item) => {
                const Icon = SOURCE_ICONS[item.source];
                const clickable = Boolean(item.href) || Boolean(item.rowId);

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={!clickable}
                      onClick={() => void handleClick(item)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                        clickable ? 'hover:bg-slate-800/60' : 'cursor-default'
                      } ${item.isRead ? 'opacity-60' : ''}`}
                    >
                      <span className={`mt-0.5 shrink-0 ${SEVERITY_TONES[item.severity]}`}>
                        {item.severity === 'critical' ? (
                          <AlertTriangle className="h-4 w-4" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-white">{item.title}</span>
                        <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-400">
                          {item.message}
                        </span>
                        <span className="mt-1 block text-[10px] text-slate-500">
                          {formatMoment(item.createdAt)}
                        </span>
                      </span>
                      {!item.isRead && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-mora-green" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
