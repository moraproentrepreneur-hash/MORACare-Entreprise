'use client';

import React from 'react';
import {
  AlertTriangle,
  Building2,
  CreditCard,
  Info,
  Inbox,
  KeyRound,
  MessagesSquare,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import {
  CATEGORY_LABELS,
  type AppNotification,
  type NotificationCategory,
  type NotificationSeverity,
} from '@/services/notification.service';

/**
 * Éléments partagés par la cloche et le Centre de notifications.
 *
 * Les deux affichent les mêmes événements ; une icône ou un ton qui
 * divergeraient entre l'aperçu et l'écran de gestion feraient douter qu'il
 * s'agit du même élément.
 */

export const CATEGORY_ICONS: Record<NotificationCategory, React.ElementType> = {
  system: Info,
  activation_code: ShieldCheck,
  registration_request: Inbox,
  contact_request: MessagesSquare,
  password_reset: KeyRound,
  establishment_created: Building2,
  admin_created: UserPlus,
  subscription_expiry: CreditCard,
  license_expiry: KeyRound,
  critical_error: AlertTriangle,
};

export const SEVERITY_TONES: Record<NotificationSeverity, string> = {
  info: 'text-mora-green',
  warning: 'text-amber-400',
  critical: 'text-red-400',
};

export const SEVERITY_BADGES: Record<NotificationSeverity, string> = {
  info: 'bg-mora-green/15 text-mora-green',
  warning: 'bg-amber-500/15 text-amber-400',
  critical: 'bg-red-500/15 text-red-400',
};

export const formatMoment = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (minutes < 1440) return `Il y a ${Math.floor(minutes / 60)} h`;

  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/** Ligne de notification, cliquable. */
export const NotificationRow: React.FC<{
  notification: AppNotification;
  onOpen: () => void;
  subtitle?: string;
}> = ({ notification, onOpen, subtitle }) => {
  const Icon = CATEGORY_ICONS[notification.category];

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-800/60 ${
        notification.isRead ? 'opacity-60' : ''
      }`}
    >
      <span className={`mt-0.5 shrink-0 ${SEVERITY_TONES[notification.severity]}`}>
        {notification.severity === 'critical' ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold text-white">{notification.title}</span>
        <span className="mt-0.5 block truncate text-[11px] leading-relaxed text-slate-400">
          {notification.message}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
          <span className="rounded bg-slate-800 px-1.5 py-0.5">
            {CATEGORY_LABELS[notification.category]}
          </span>
          {subtitle && <span>{subtitle}</span>}
        </span>
      </span>

      {!notification.isRead && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-mora-green" />
      )}
    </button>
  );
};
