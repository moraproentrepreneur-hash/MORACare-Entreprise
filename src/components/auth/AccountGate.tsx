'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Check, KeyRound, MailCheck, ShieldAlert, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import {
  changeOwnPassword,
  sendActivationCode,
  verifyActivationCode,
  type ActivationDispatch,
} from '@/services/auth.service';
import { evaluatePassword, DEFAULT_PASSWORD_POLICY } from '@/lib/password-policy';

/**
 * Verrou d'entrée des espaces authentifiés.
 *
 * Deux obligations peuvent se dresser entre la connexion et le tableau de bord :
 * confirmer son adresse par un code à six chiffres, puis remplacer le mot de
 * passe temporaire. Tant que l'une d'elles subsiste, aucun contenu métier n'est
 * rendu — pas seulement masqué : le composant enfant n'est pas monté, donc
 * aucune requête de données n'est émise.
 *
 * L'ordre est délibéré : on vérifie d'abord que la personne est bien joignable à
 * l'adresse déclarée, et seulement ensuite on lui fait choisir un secret.
 */
export const AccountGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, refreshProfile, logout } = useAuth();

  if (!user) return <>{children}</>;

  if (user.activation_required) {
    return <ActivationStep onDone={refreshProfile} onCancel={() => void logout()} />;
  }

  if (user.must_change_password) {
    return <PasswordStep onDone={refreshProfile} onCancel={() => void logout()} />;
  }

  return <>{children}</>;
};

// ---------------------------------------------------------------------------
// Habillage commun
// ---------------------------------------------------------------------------

const Shell: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
  onCancel: () => void;
}> = ({ icon: Icon, title, description, children, onCancel }) => (
  <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-slate-100">
    <div className="w-full max-w-md">
      <div className="mb-8 flex items-center justify-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-mora-blue to-mora-green">
          <Activity className="h-5 w-5 text-white" />
        </span>
        <span className="text-xl font-black tracking-tight text-white">
          MORA<span className="text-mora-green">Care</span>
        </span>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-mora-green/15 text-mora-green">
          <Icon className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-center text-xl font-black text-white">{title}</h1>
        <p className="mt-2 text-center text-sm leading-relaxed text-slate-400">{description}</p>

        <div className="mt-6">{children}</div>
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="mx-auto mt-6 block text-xs text-slate-500 transition-colors hover:text-slate-300"
      >
        Se déconnecter
      </button>
    </div>
  </div>
);

const FIELD =
  'w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-mora-green';

// ---------------------------------------------------------------------------
// Étape 1 — activation par code
// ---------------------------------------------------------------------------

const ActivationStep: React.FC<{ onDone: () => Promise<void>; onCancel: () => void }> = ({
  onDone,
  onCancel,
}) => {
  const [code, setCode] = useState('');
  const [dispatch, setDispatch] = useState<ActivationDispatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const send = useCallback(async () => {
    setIsSending(true);
    setError(null);
    try {
      setDispatch(await sendActivationCode());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Le code n'a pas pu être envoyé.");
    } finally {
      setIsSending(false);
    }
  }, []);

  // Un code est émis dès l'affichage : demander à l'utilisateur de cliquer pour
  // recevoir ce qu'il attend de toute façon n'apporte rien.
  useEffect(() => {
    void send();
  }, [send]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setError(null);
    try {
      await verifyActivationCode(code);
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code incorrect.');
      setCode('');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Shell
      icon={MailCheck}
      title="Activez votre compte"
      description={
        dispatch
          ? `Un code à six chiffres a été envoyé à ${dispatch.email}. Il est valable ${dispatch.validMinutes} minutes.`
          : 'Un code à six chiffres vous est envoyé par e-mail.'
      }
      onCancel={onCancel}
    >
      {/*
        L'acheminement peut échouer — fournisseur non configuré, adresse
        injoignable. Le taire laisserait l'utilisateur attendre indéfiniment un
        courriel qui n'arrivera pas.
      */}
      {dispatch && !dispatch.delivered && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-200/90">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <span>
            L&apos;envoi automatique n&apos;a pas abouti. Votre code est enregistré : contactez
            MORA Shawiri au +269 430 63 06 pour qu&apos;il vous soit communiqué.
          </span>
        </div>
      )}

      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label htmlFor="activation-code" className="mb-1.5 block text-xs font-semibold text-slate-300">
            Code de vérification
          </label>
          <input
            id="activation-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className={`${FIELD} text-center font-mono text-2xl tracking-[0.5em]`}
          />
        </div>

        <Button
          type="submit"
          variant="secondary"
          isLoading={isVerifying}
          disabled={code.length !== 6}
          className="w-full py-3 font-bold"
        >
          Activer mon compte
        </Button>
      </form>

      <button
        type="button"
        onClick={() => void send()}
        disabled={isSending}
        className="mt-4 w-full text-center text-xs text-mora-green transition-colors hover:underline disabled:opacity-50"
      >
        {isSending ? 'Envoi en cours…' : 'Renvoyer un code'}
      </button>
    </Shell>
  );
};

// ---------------------------------------------------------------------------
// Étape 2 — changement obligatoire du mot de passe
// ---------------------------------------------------------------------------

const PasswordStep: React.FC<{ onDone: () => Promise<void>; onCancel: () => void }> = ({
  onDone,
  onCancel,
}) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // La politique du serveur fait foi ; celle-ci guide la saisie en temps réel.
  const rules = evaluatePassword(next, DEFAULT_PASSWORD_POLICY);
  const satisfied = rules.every((rule) => rule.satisfied);
  const matches = next.length > 0 && next === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!matches) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setIsSaving(true);
    try {
      await changeOwnPassword(current, next);
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Le mot de passe n’a pas pu être modifié.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Shell
      icon={KeyRound}
      title="Choisissez votre mot de passe"
      description="Le mot de passe qui vous a été remis est temporaire. Remplacez-le pour accéder à votre espace."
      onCancel={onCancel}
    >
      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="pw-current" className="mb-1.5 block text-xs font-semibold text-slate-300">
            Mot de passe temporaire
          </label>
          <input
            id="pw-current"
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={FIELD}
          />
        </div>

        <div>
          <label htmlFor="pw-next" className="mb-1.5 block text-xs font-semibold text-slate-300">
            Nouveau mot de passe
          </label>
          <input
            id="pw-next"
            type="password"
            autoComplete="new-password"
            required
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className={FIELD}
          />

          <ul className="mt-3 space-y-1.5">
            {rules.map((rule) => (
              <li key={rule.id} className="flex items-center gap-2 text-[11px]">
                {rule.satisfied ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-mora-green" />
                ) : (
                  <X className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                )}
                <span className={rule.satisfied ? 'text-slate-300' : 'text-slate-500'}>
                  {rule.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <label htmlFor="pw-confirm" className="mb-1.5 block text-xs font-semibold text-slate-300">
            Confirmation
          </label>
          <input
            id="pw-confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={FIELD}
          />
          {confirm.length > 0 && !matches && (
            <p className="mt-1.5 text-[11px] text-red-400">
              Les deux mots de passe ne correspondent pas.
            </p>
          )}
        </div>

        <Button
          type="submit"
          variant="secondary"
          isLoading={isSaving}
          disabled={!satisfied || !matches || current.length === 0}
          className="w-full py-3 font-bold"
        >
          Enregistrer et continuer
        </Button>
      </form>
    </Shell>
  );
};
