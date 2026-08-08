'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadCount,
  type AppNotification,
} from '@/services/notification.service';
import { NotificationRow, formatMoment } from './notification-ui';

/**
 * Cloche de notifications.
 *
 * Aperçu des derniers événements. Le traitement — filtrage, consultation du
 * détail, archivage — se fait dans le Centre de notifications ; ce panneau
 * n'en est que le raccourci, et évite d'y dupliquer une seconde interface de
 * gestion qui divergerait.
 *
 * Le contenu est rechargé à chaque ouverture : les échéances d'abonnement sont
 * recalculées, et l'afficher tel qu'il était au chargement de la page
 * reviendrait à mentir dès la première minute.
 */

const PREVIEW_LIMIT = 8;

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      setItems(await loadNotifications());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Premier chargement : la pastille doit être juste avant toute ouverture.
  useEffect(() => {
    void load();
  }, [load]);

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

  const handleOpen = async (item: AppNotification) => {
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
    setIsOpen(false);
    // À défaut d'écran concerné, on renvoie vers le Centre de l'espace où l'on
    // se trouve : celui de l'éditeur n'est pas accessible à un responsable
    // d'établissement, et le lien y menait quel que soit le rôle.
    router.push(
      item.href ??
        (user?.role === 'super_admin' ? '/admin/notifications' : '/notifications'),
    );
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      setItems((list) => list.map((entry) => ({ ...entry, isRead: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible.');
    }
  };

  const unread = unreadCount(items);
  const hasStoredUnread = items.some((item) => item.rowId && !item.isRead);
  const preview = items.slice(0, PREVIEW_LIMIT);
  const isSuperAdmin = user?.role === 'super_admin';

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
              {hasStoredUnread && (
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

          <div className="max-h-[calc(70vh-8rem)] overflow-y-auto sm:max-h-80">
            {isLoading && <p className="px-4 py-8 text-center text-xs text-slate-500">Chargement…</p>}

            {error && (
              <p className="m-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                {error}
              </p>
            )}

            {!isLoading && !error && preview.length === 0 && (
              <div className="px-4 py-10 text-center">
                <Bell className="mx-auto h-8 w-8 text-slate-700" />
                <p className="mt-3 text-xs text-slate-500">
                  Aucune notification. Les demandes, codes et échéances apparaîtront ici.
                </p>
              </div>
            )}

            <ul className="divide-y divide-slate-800">
              {preview.map((item) => (
                <li key={item.id}>
                  <NotificationRow
                    notification={item}
                    onOpen={() => void handleOpen(item)}
                    subtitle={formatMoment(item.createdAt)}
                  />
                </li>
              ))}
            </ul>
          </div>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push('/admin/notifications');
              }}
              className="w-full border-t border-slate-800 px-4 py-3 text-center text-xs font-semibold text-mora-green transition-colors hover:bg-slate-800/60"
            >
              Ouvrir le Centre de notifications
            </button>
          )}
        </div>
      )}
    </div>
  );
};
