'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Clock,
  Eraser,
  History,
  KeyRound,
  Lock,
  LockOpen,
  ShieldCheck,
  Timer,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { describePolicy } from '@/lib/password-policy';
import {
  describeFailure,
  getPlatformSecurity,
  listLockedAccounts,
  listRecentLoginAttempts,
  purgeExpiredAuditLogs,
  unlockAccount,
  updatePlatformSecurity,
  type LockedAccount,
  type LoginAttempt,
  type SecurityConfiguration,
} from '@/services/security.service';

/**
 * Centre de sécurité de la plateforme.
 *
 * Cet écran ne décrit pas la sécurité : il la pilote. Chaque champ correspond à
 * une colonne de `security_settings`, relue par le serveur à chaque connexion et
 * à chaque changement de mot de passe. Baisser le nombre de tentatives ici
 * verrouille réellement plus tôt ; allonger la rétention conserve réellement
 * plus de journaux.
 *
 * Le Super Admin seul écrit — la politique RLS `security_settings_admin` le
 * garantit côté base. Les autres rôles consultent.
 */

type Tab = 'policy' | 'sessions' | 'attempts' | 'retention';

const TABS: readonly { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'policy', label: 'Mots de passe', icon: KeyRound },
  { id: 'sessions', label: 'Sessions & verrouillage', icon: Timer },
  { id: 'attempts', label: 'Tentatives de connexion', icon: History },
  { id: 'retention', label: 'Rétention & audit', icon: Eraser },
];

const formatMoment = (iso: string): string =>
  new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const minutesLabel = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
};

export const SecurityPanel: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const [tab, setTab] = useState<Tab>('policy');
  const [config, setConfig] = useState<SecurityConfiguration | null>(null);
  const [draft, setDraft] = useState<SecurityConfiguration | null>(null);
  const [attempts, setAttempts] = useState<LoginAttempt[]>([]);
  const [locked, setLocked] = useState<LockedAccount[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const settings = await getPlatformSecurity();
      setConfig(settings);
      setDraft(settings);

      // Ces deux lectures sont réservées au Super Admin par RLS : les demander
      // pour un autre rôle produirait une erreur inutile à l'écran.
      if (isSuperAdmin) {
        const [recent, lockedAccounts] = await Promise.all([
          listRecentLoginAttempts(50),
          listLockedAccounts(),
        ]);
        setAttempts(recent);
        setLocked(lockedAccounts);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    } finally {
      setIsLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = JSON.stringify(config) !== JSON.stringify(draft);

  const handleSave = async () => {
    if (!draft || !user) return;
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      await updatePlatformSecurity(
        draft.id,
        {
          password: draft.password,
          passwordExpiryDays: draft.passwordExpiryDays,
          sessionMaxMinutes: draft.sessionMaxMinutes,
          sessionIdleMinutes: draft.sessionIdleMinutes,
          maxLoginAttempts: draft.maxLoginAttempts,
          lockoutMinutes: draft.lockoutMinutes,
          auditRetentionDays: draft.auditRetentionDays,
          twoFactorEnabled: draft.twoFactorEnabled,
          twoFactorMethod: draft.twoFactorMethod,
        },
        user.id,
      );
      await load();
      setNotice('Les paramètres de sécurité sont enregistrés et appliqués.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnlock = async (account: LockedAccount) => {
    setError(null);
    try {
      await unlockAccount(account.id);
      await load();
      setNotice(`Le compte de ${account.fullName} est déverrouillé.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Déverrouillage impossible.');
    }
  };

  const handlePurge = async () => {
    setError(null);
    setNotice(null);
    try {
      const removed = await purgeExpiredAuditLogs();
      await load();
      setNotice(
        removed === 0
          ? "Aucune entrée n'a dépassé la durée de rétention."
          : `${removed} entrée${removed > 1 ? 's' : ''} supprimée${removed > 1 ? 's' : ''} du journal d'audit.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purge impossible.');
    }
  };

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl border border-slate-800 bg-slate-900" />;
  }

  if (!draft) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300">
        Aucune politique de sécurité n&apos;est enregistrée. Appliquez les migrations de la base.
      </div>
    );
  }

  const field =
    'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-mora-blue disabled:opacity-60';

  const update = (patch: Partial<SecurityConfiguration>) =>
    setDraft((current) => (current ? { ...current, ...patch } : current));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <h3 className="flex items-center gap-2 text-base font-bold text-white">
          <Lock className="h-4 w-4 shrink-0 text-mora-green" /> Centre de sécurité
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Ces réglages sont appliqués par le serveur à chaque connexion et à chaque changement de
          mot de passe.
        </p>
        {!isSuperAdmin && (
          <p className="mt-3 text-[11px] text-amber-400">
            Consultation seule : seul MORA Shawiri modifie la politique de la plateforme.
          </p>
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

      <div className="flex gap-2 overflow-x-auto border-b border-slate-800 pb-2">
        {TABS.map((entry) => {
          const Icon = entry.icon;
          const active = tab === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                active
                  ? 'bg-mora-blue text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{entry.label}</span>
            </button>
          );
        })}
      </div>

      {/* ---------------- Politique des mots de passe ---------------- */}
      {tab === 'policy' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
            <h4 className="text-sm font-bold text-white">Politique des mots de passe</h4>
            <p className="mt-1 text-xs text-slate-400">
              Appliquée à tous les comptes sans exception, du Super Admin au personnel.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="pw-min" className="mb-1 block text-xs font-semibold text-slate-300">
                  Longueur minimale
                </label>
                <input
                  id="pw-min"
                  type="number"
                  min={8}
                  max={128}
                  disabled={!isSuperAdmin}
                  value={draft.password.minLength}
                  onChange={(e) =>
                    update({
                      password: { ...draft.password, minLength: Number(e.target.value) || 8 },
                    })
                  }
                  className={field}
                />
                <p className="mt-1 text-[11px] text-slate-500">Huit caractères au minimum.</p>
              </div>

              <div>
                <label htmlFor="pw-exp" className="mb-1 block text-xs font-semibold text-slate-300">
                  Expiration (jours)
                </label>
                <input
                  id="pw-exp"
                  type="number"
                  min={0}
                  max={3650}
                  disabled={!isSuperAdmin}
                  value={draft.passwordExpiryDays ?? 0}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    update({ passwordExpiryDays: value > 0 ? value : null });
                  }}
                  className={field}
                />
                <p className="mt-1 text-[11px] text-slate-500">0 = sans expiration.</p>
              </div>
            </div>

            <fieldset className="mt-5">
              <legend className="mb-2 text-xs font-semibold text-slate-300">
                Caractères obligatoires
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ['requireUppercase', 'Une lettre majuscule'],
                    ['requireLowercase', 'Une lettre minuscule'],
                    ['requireDigit', 'Un chiffre'],
                    ['requireSpecial', 'Un caractère spécial'],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-slate-300"
                  >
                    <input
                      type="checkbox"
                      disabled={!isSuperAdmin}
                      checked={draft.password[key]}
                      onChange={(e) =>
                        update({ password: { ...draft.password, [key]: e.target.checked } })
                      }
                      className="h-4 w-4 accent-mora-green"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <p className="mt-4 rounded-xl bg-slate-950 p-3 text-[11px] text-slate-400">
              Règle actuelle : <span className="text-slate-200">{describePolicy(draft.password)}</span>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
            <h4 className="flex items-center gap-2 text-sm font-bold text-white">
              <ShieldCheck className="h-4 w-4 text-mora-green" /> Double authentification
            </h4>
            <p className="mt-1 text-xs text-slate-400">
              Le socle est en place : émission, expiration et vérification des codes à six chiffres
              sont opérationnelles et déjà utilisées pour l&apos;activation des comptes. Activer ce
              réglage étendra la même mécanique à chaque connexion.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-slate-300">
                <input
                  type="checkbox"
                  disabled={!isSuperAdmin}
                  checked={draft.twoFactorEnabled}
                  onChange={(e) => update({ twoFactorEnabled: e.target.checked })}
                  className="h-4 w-4 accent-mora-green"
                />
                Exiger un second facteur à la connexion
              </label>

              <div>
                <label htmlFor="tf-method" className="mb-1 block text-xs font-semibold text-slate-300">
                  Canal du second facteur
                </label>
                <select
                  id="tf-method"
                  disabled={!isSuperAdmin}
                  value={draft.twoFactorMethod}
                  onChange={(e) =>
                    update({
                      twoFactorMethod: e.target.value as SecurityConfiguration['twoFactorMethod'],
                    })
                  }
                  className={field}
                >
                  <option value="email">E-mail</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="totp">Application d&apos;authentification</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Sessions et verrouillage ---------------- */}
      {tab === 'sessions' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
            <h4 className="text-sm font-bold text-white">Sessions</h4>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="sess-max" className="mb-1 block text-xs font-semibold text-slate-300">
                  Durée maximale (minutes)
                </label>
                <input
                  id="sess-max"
                  type="number"
                  min={5}
                  max={43200}
                  disabled={!isSuperAdmin}
                  value={draft.sessionMaxMinutes}
                  onChange={(e) => update({ sessionMaxMinutes: Number(e.target.value) || 5 })}
                  className={field}
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Actuellement {minutesLabel(draft.sessionMaxMinutes)}.
                </p>
              </div>
              <div>
                <label htmlFor="sess-idle" className="mb-1 block text-xs font-semibold text-slate-300">
                  Inactivité avant déconnexion (minutes)
                </label>
                <input
                  id="sess-idle"
                  type="number"
                  min={5}
                  max={1440}
                  disabled={!isSuperAdmin}
                  value={draft.sessionIdleMinutes}
                  onChange={(e) => update({ sessionIdleMinutes: Number(e.target.value) || 5 })}
                  className={field}
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Actuellement {minutesLabel(draft.sessionIdleMinutes)}.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
            <h4 className="text-sm font-bold text-white">Verrouillage automatique</h4>
            <p className="mt-1 text-xs text-slate-400">
              Après le nombre d&apos;échecs indiqué, le compte est bloqué pour la durée choisie et
              l&apos;événement est inscrit au journal d&apos;audit.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="max-att" className="mb-1 block text-xs font-semibold text-slate-300">
                  Tentatives autorisées
                </label>
                <input
                  id="max-att"
                  type="number"
                  min={1}
                  max={20}
                  disabled={!isSuperAdmin}
                  value={draft.maxLoginAttempts}
                  onChange={(e) => update({ maxLoginAttempts: Number(e.target.value) || 1 })}
                  className={field}
                />
              </div>
              <div>
                <label htmlFor="lock-min" className="mb-1 block text-xs font-semibold text-slate-300">
                  Durée du verrouillage (minutes)
                </label>
                <input
                  id="lock-min"
                  type="number"
                  min={1}
                  max={1440}
                  disabled={!isSuperAdmin}
                  value={draft.lockoutMinutes}
                  onChange={(e) => update({ lockoutMinutes: Number(e.target.value) || 1 })}
                  className={field}
                />
              </div>
            </div>
          </div>

          {isSuperAdmin && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
              <h4 className="flex items-center gap-2 text-sm font-bold text-white">
                <LockOpen className="h-4 w-4 text-amber-400" /> Comptes actuellement verrouillés
              </h4>

              {locked.length === 0 ? (
                <p className="mt-3 text-xs text-slate-500">Aucun compte n&apos;est verrouillé.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {locked.map((account) => (
                    <li
                      key={account.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-950 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-white">{account.fullName}</p>
                        <p className="truncate font-mono text-[11px] text-slate-500">
                          {account.username} — jusqu&apos;à {formatMoment(account.lockedUntil)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleUnlock(account)}
                        className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-700"
                      >
                        Déverrouiller
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---------------- Tentatives de connexion ---------------- */}
      {tab === 'attempts' && (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-4 text-sm font-bold text-white">
            50 dernières tentatives de connexion
          </div>

          {!isSuperAdmin ? (
            <p className="p-6 text-xs text-slate-500">
              Ce journal est réservé à MORA Shawiri.
            </p>
          ) : attempts.length === 0 ? (
            <p className="p-6 text-xs text-slate-500">Aucune tentative enregistrée.</p>
          ) : (
            <>
              {/* Mobile : une carte par tentative. */}
              <ul className="divide-y divide-slate-800 md:hidden">
                {attempts.map((attempt) => (
                  <li key={attempt.id} className="space-y-1 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-xs text-slate-200">
                        {attempt.identifier}
                      </span>
                      {attempt.succeeded ? (
                        <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                      ) : (
                        <X className="h-4 w-4 shrink-0 text-red-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {formatMoment(attempt.createdAt)} — {attempt.ipAddress}
                    </p>
                    {!attempt.succeeded && (
                      <p className="text-[11px] text-amber-400">
                        {describeFailure(attempt.failureReason)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[42rem] text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th scope="col" className="p-4">Date</th>
                      <th scope="col" className="p-4">Identifiant</th>
                      <th scope="col" className="p-4">Résultat</th>
                      <th scope="col" className="p-4">Motif</th>
                      <th scope="col" className="p-4">Adresse IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {attempts.map((attempt) => (
                      <tr key={attempt.id} className="hover:bg-slate-800/40">
                        <td className="whitespace-nowrap p-4">{formatMoment(attempt.createdAt)}</td>
                        <td className="p-4 font-mono">{attempt.identifier}</td>
                        <td className="p-4">
                          <span
                            className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                              attempt.succeeded
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-red-500/15 text-red-400'
                            }`}
                          >
                            {attempt.succeeded ? 'Réussie' : 'Échouée'}
                          </span>
                        </td>
                        <td className="p-4">{describeFailure(attempt.failureReason)}</td>
                        <td className="whitespace-nowrap p-4 font-mono">{attempt.ipAddress}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ---------------- Rétention ---------------- */}
      {tab === 'retention' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
            <h4 className="flex items-center gap-2 text-sm font-bold text-white">
              <Clock className="h-4 w-4 text-mora-green" /> Politique de rétention
            </h4>
            <p className="mt-1 text-xs text-slate-400">
              Durée de conservation du journal d&apos;audit et des tentatives de connexion.
            </p>

            <div className="mt-4 max-w-xs">
              <label htmlFor="retention" className="mb-1 block text-xs font-semibold text-slate-300">
                Conservation (jours)
              </label>
              <input
                id="retention"
                type="number"
                min={30}
                max={3650}
                disabled={!isSuperAdmin}
                value={draft.auditRetentionDays}
                onChange={(e) => update({ auditRetentionDays: Number(e.target.value) || 30 })}
                className={field}
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Entre 30 jours et 10 ans. Actuellement{' '}
                {Math.round((draft.auditRetentionDays / 365) * 10) / 10} an(s).
              </p>
            </div>
          </div>

          {isSuperAdmin && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
              <h4 className="text-sm font-bold text-white">Appliquer la rétention maintenant</h4>
              <p className="mt-1 text-xs text-slate-400">
                Supprime définitivement les entrées antérieures à la durée configurée. Le journal
                d&apos;audit n&apos;étant pas modifiable, cette purge est la seule opération qui
                puisse en retirer des lignes.
              </p>
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-200/90">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span>Cette suppression est irréversible.</span>
              </div>
              <Button
                variant="outline"
                onClick={() => void handlePurge()}
                className="mt-4 w-full gap-2 sm:w-auto"
              >
                <Eraser className="h-4 w-4" /> Purger les entrées expirées
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Barre d'enregistrement, affichée dès qu'une valeur change. */}
      {isSuperAdmin && dirty && (
        <div className="sticky bottom-0 z-10 flex flex-col gap-2 rounded-2xl border border-mora-green/40 bg-slate-900/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-300">Modifications en attente d&apos;enregistrement.</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setDraft(config)}
              className="flex-1 sm:flex-none"
            >
              Annuler
            </Button>
            <Button
              variant="secondary"
              isLoading={isSaving}
              onClick={() => void handleSave()}
              className="flex-1 font-bold sm:flex-none sm:px-8"
            >
              Enregistrer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
