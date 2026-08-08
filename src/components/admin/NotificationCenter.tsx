'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Archive,
  ArchiveRestore,
  BellRing,
  Check,
  CheckCheck,
  Copy,
  ExternalLink,
  Mail,
  Phone,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { ActionMenu } from '@/components/ui/ActionMenu';
import {
  CATEGORY_LABELS,
  archiveNotification,
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
  type NotificationCategory,
  type NotificationSeverity,
} from '@/services/notification.service';
import {
  CATEGORY_ICONS,
  SEVERITY_BADGES,
  SEVERITY_TONES,
  formatDateTime,
  formatMoment,
} from '@/components/dashboard/notification-ui';

/**
 * Centre de notifications — point unique de réception des événements.
 *
 * Il remplace les écrans « Gestion des demandes » et « Prises de contact » :
 * ces événements y arrivent avec leur charge utile complète, consultable dans
 * le détail. Un écran par type de demande obligeait à en faire le tour pour
 * savoir s'il restait quelque chose à traiter.
 *
 * Le même composant sert la console éditeur et l'espace établissement. Ce
 * n'est pas lui qui décide de ce que chacun voit : les politiques RLS le font,
 * et lui offre les mêmes actions sur tout ce qu'elles lui renvoient. Les
 * échéances d'abonnement et de licence sont des notifications comme les
 * autres, marquables et archivables.
 */

type Scope = 'active' | 'archived';

const SEVERITY_LABELS: Record<NotificationSeverity, string> = {
  info: 'Information',
  warning: 'À traiter',
  critical: 'Critique',
};

export const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [opened, setOpened] = useState<AppNotification | null>(null);

  const [scope, setScope] = useState<Scope>('active');
  const [category, setCategory] = useState<NotificationCategory | 'all'>('all');
  const [severity, setSeverity] = useState<NotificationSeverity | 'all'>('all');
  const [readState, setReadState] = useState<'all' | 'unread' | 'read'>('all');

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setItems(await loadNotifications({ includeArchived: scope === 'archived' }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    } finally {
      setIsLoading(false);
    }
  }, [user, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (item: AppNotification, task: () => Promise<void>, message: string) => {
    setBusyId(item.id);
    setError(null);
    setNotice(null);
    try {
      await task();
      await load();
      setNotice(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'opération a échoué.");
    } finally {
      setBusyId(null);
    }
  };

  const openDetail = async (item: AppNotification) => {
    setOpened(item);
    if (item.rowId && !item.isRead) {
      try {
        await markNotificationRead(item.rowId);
        setItems((list) =>
          list.map((entry) => (entry.id === item.id ? { ...entry, isRead: true } : entry)),
        );
      } catch {
        // La consultation ne doit pas échouer parce que le marquage a échoué.
      }
    }
  };

  const visible = useMemo(
    () =>
      items
        .filter((item) => (scope === 'archived' ? item.isArchived : !item.isArchived))
        .filter((item) => category === 'all' || item.category === category)
        .filter((item) => severity === 'all' || item.severity === severity)
        .filter((item) =>
          readState === 'all' ? true : readState === 'unread' ? !item.isRead : item.isRead,
        ),
    [items, scope, category, severity, readState],
  );

  const unread = items.filter((item) => !item.isRead && !item.isArchived).length;

  // Seules les catégories réellement présentes sont proposées : un filtre qui
  // ne renvoie jamais rien n'aide personne.
  const categoryOptions = useMemo(() => {
    const present = new Set(items.map((item) => item.category));
    return [
      { value: 'all' as const, label: 'Toutes les catégories' },
      ...(Object.keys(CATEGORY_LABELS) as NotificationCategory[])
        .filter((key) => present.has(key))
        .map((key) => ({ value: key, label: CATEGORY_LABELS[key] })),
    ];
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-white sm:text-xl">
            <BellRing className="h-5 w-5 shrink-0 text-mora-green" /> Centre de notifications
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Point unique de réception des événements de la plateforme.
            {unread > 0 && (
              <span className="ml-1 font-semibold text-amber-400">{unread} à traiter.</span>
            )}
          </p>
        </div>

        {unread > 0 && (
          <Button
            variant="outline"
            onClick={() =>
              void run(
                { id: 'all' } as AppNotification,
                () => markAllNotificationsRead(),
                'Toutes les notifications sont marquées comme lues.',
              )
            }
            className="w-full shrink-0 gap-2 sm:w-auto"
          >
            <CheckCheck className="h-4 w-4" /> Tout marquer comme lu
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-400">
          {notice}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select<Scope>
          aria-label="Portée"
          value={scope}
          onChange={setScope}
          options={[
            { value: 'active', label: 'Notifications actives' },
            { value: 'archived', label: 'Archivées' },
          ]}
        />
        <Select
          aria-label="Filtrer par catégorie"
          value={category}
          onChange={(value) => setCategory(value as NotificationCategory | 'all')}
          options={categoryOptions}
        />
        <Select
          aria-label="Filtrer par gravité"
          value={severity}
          onChange={(value) => setSeverity(value as NotificationSeverity | 'all')}
          options={[
            { value: 'all', label: 'Toutes les gravités' },
            { value: 'info', label: 'Information' },
            { value: 'warning', label: 'À traiter' },
            { value: 'critical', label: 'Critique' },
          ]}
        />
        <Select
          aria-label="Filtrer par état de lecture"
          value={readState}
          onChange={(value) => setReadState(value as 'all' | 'unread' | 'read')}
          options={[
            { value: 'all', label: 'Lues et non lues' },
            { value: 'unread', label: 'Non lues' },
            { value: 'read', label: 'Lues' },
          ]}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        {isLoading && <p className="p-8 text-center text-xs text-slate-500">Chargement…</p>}

        {!isLoading && visible.length === 0 && (
          <div className="px-4 py-12 text-center">
            <BellRing className="mx-auto h-8 w-8 text-slate-700" />
            <p className="mt-3 text-xs text-slate-500">
              {scope === 'archived'
                ? 'Aucune notification archivée.'
                : 'Aucune notification à traiter.'}
            </p>
          </div>
        )}

        <ul className="divide-y divide-slate-800">
          {visible.map((item) => {
            const Icon = CATEGORY_ICONS[item.category];

            return (
              <li key={item.id} className="flex items-start gap-3 p-4">
                <span className={`mt-0.5 shrink-0 ${SEVERITY_TONES[item.severity]}`}>
                  <Icon className="h-4 w-4" />
                </span>

                <button
                  type="button"
                  onClick={() => void openDetail(item)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span
                      className={`truncate text-sm font-bold ${
                        item.isRead ? 'text-slate-400' : 'text-white'
                      }`}
                    >
                      {item.title}
                    </span>
                    {!item.isRead && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-mora-green" />
                    )}
                  </span>

                  <span className="mt-0.5 block text-xs text-slate-400">{item.message}</span>

                  <span className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-400">
                      {CATEGORY_LABELS[item.category]}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 font-semibold ${SEVERITY_BADGES[item.severity]}`}
                    >
                      {SEVERITY_LABELS[item.severity]}
                    </span>
                    {item.reference && (
                      <span className="font-mono text-slate-500">{item.reference}</span>
                    )}
                    <span className="text-slate-500">{formatMoment(item.createdAt)}</span>
                  </span>
                </button>

                <div className="shrink-0">
                  <ActionMenu
                    label={`Actions pour ${item.title}`}
                    disabled={busyId === item.id}
                    items={[
                      {
                        label: 'Consulter le détail',
                        icon: ExternalLink,
                        onSelect: () => void openDetail(item),
                      },
                      {
                        label: item.isRead ? 'Marquer comme non lue' : 'Marquer comme lue',
                        icon: Check,
                        onSelect: () =>
                          void run(
                            item,
                            () => markNotificationRead(item.rowId, !item.isRead),
                            item.isRead ? 'Marquée comme non lue.' : 'Marquée comme lue.',
                          ),
                      },
                      {
                        label: item.isArchived ? 'Désarchiver' : 'Archiver',
                        icon: item.isArchived ? ArchiveRestore : Archive,
                        onSelect: () =>
                          void run(
                            item,
                            () => archiveNotification(item.rowId, !item.isArchived),
                            item.isArchived ? 'Notification restaurée.' : 'Notification archivée.',
                          ),
                      },
                      ...(item.href
                        ? [
                            {
                              label: "Ouvrir l'écran concerné",
                              icon: ExternalLink,
                              onSelect: () => router.push(item.href as string),
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <NotificationDetail notification={opened} onClose={() => setOpened(null)} />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Détail
// ---------------------------------------------------------------------------

/** Champs de la charge utile, dans un ordre lisible, avec leur libellé. */
const METADATA_LABELS: Record<string, string> = {
  code: 'Code de vérification',
  status: 'Statut',
  expiresAt: 'Expire le',
  fullName: 'Nom',
  establishmentName: 'Établissement',
  username: 'Identifiant',
  email: 'E-mail',
  phone: 'Téléphone',
  identifier: 'Identifiant saisi',
  accountFound: 'Compte reconnu',
  reference: 'Référence',
  subject: 'Sujet',
  message: 'Message',
  planName: 'Formule',
  durationMonths: 'Durée (mois)',
  baseMonthlyPrice: 'Prix mensuel normal',
  monthlyPrice: 'Prix mensuel appliqué',
  totalPrice: 'Total',
  savings: 'Économie totale',
  paymentMethod: 'Mode de paiement',
  startOption: 'Démarrage',
  role: 'Rôle',
  emailDelivered: 'Envoyé par e-mail',
  credentialsEmailSent: 'Identifiants envoyés',
};

const ORDER = Object.keys(METADATA_LABELS);

const renderValue = (key: string, value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (key === 'expiresAt' && typeof value === 'string') return formatDateTime(value);
  if (typeof value === 'number') return new Intl.NumberFormat('fr-FR').format(value);
  return String(value);
};

const NotificationDetail: React.FC<{
  notification: AppNotification | null;
  onClose: () => void;
}> = ({ notification, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!notification) return null;

  const metadata = notification.metadata ?? {};
  const entries = [
    ...ORDER.filter((key) => key in metadata).map((key) => [key, metadata[key]] as const),
    ...Object.entries(metadata).filter(([key]) => !ORDER.includes(key)),
  ];

  const code = typeof metadata.code === 'string' ? metadata.code : null;
  const email = typeof metadata.email === 'string' ? metadata.email : null;
  const phone = typeof metadata.phone === 'string' ? metadata.phone : null;

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Le presse-papiers peut être refusé : le code reste lisible à l'écran.
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={notification.title}
      description={`${CATEGORY_LABELS[notification.category]} · ${formatDateTime(notification.createdAt)}`}
      maxWidth="xl"
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-slate-300">{notification.message}</p>

        {/* Le code d'activation est mis en avant : c'est la raison d'être de
            cette notification quand l'envoi automatique n'a pas abouti. */}
        {code && (
          <div className="rounded-xl border border-mora-green/40 bg-slate-950 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Code de vérification
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="font-mono text-2xl font-black tracking-[0.3em] text-mora-green">
                {code}
              </span>
              <button
                type="button"
                onClick={() => void copyCode()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition-colors hover:bg-slate-700"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-mora-green" /> Copié
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copier
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {entries.length > 0 && (
          <dl className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950">
            {entries.map(([key, value]) => (
              <div key={key} className="flex flex-wrap items-start justify-between gap-3 p-3">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {METADATA_LABELS[key] ?? key}
                </dt>
                <dd className="max-w-full break-words text-right text-xs text-slate-200">
                  {renderValue(key, value)}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          {email && (
            <a
              href={`mailto:${email}`}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-mora-green px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-mora-green/90"
            >
              <Mail className="h-4 w-4" /> Répondre par e-mail
            </a>
          )}
          {phone && (
            <a
              href={`https://wa.me/${phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#20bd5a]"
            >
              <Phone className="h-4 w-4" /> WhatsApp
            </a>
          )}
        </div>
      </div>
    </Modal>
  );
};
