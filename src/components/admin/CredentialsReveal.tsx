'use client';

import React, { useState } from 'react';
import { AlertTriangle, Check, Copy, Mail, MailCheck, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/**
 * Remise d'identifiants fraîchement générés.
 *
 * Ce mot de passe n'existe en clair que le temps de cet affichage : la base n'en
 * conserve qu'un condensé, et aucune route ne permet de le relire. L'écran le
 * dit explicitement — un administrateur qui ferme la fenêtre en croyant pouvoir
 * y revenir devrait sinon en générer un autre.
 *
 * Deux modes de remise, tous deux réels :
 *   - la copie dans le presse-papiers ;
 *   - l'ouverture du logiciel de messagerie, message déjà rédigé.
 *
 * L'envoi automatique par le serveur a lieu en amont quand un fournisseur est
 * configuré ; `emailSent` dit s'il a abouti, et le bouton reste disponible dans
 * tous les cas.
 */

export interface Credentials {
  username: string;
  password: string;
  email: string;
  fullName: string;
  establishmentName?: string;
  /** Vrai si le serveur a déjà expédié le message au titulaire. */
  emailSent: boolean;
}

export const CredentialsReveal: React.FC<{
  credentials: Credentials;
  onClose: () => void;
}> = ({ credentials, onClose }) => {
  const [copied, setCopied] = useState<'password' | 'all' | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const summary = [
    `Identifiant : ${credentials.username}`,
    `Mot de passe : ${credentials.password}`,
  ].join('\n');

  const copy = async (text: string, what: 'password' | 'all') => {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      // Le presse-papiers est refusé hors contexte sécurisé ou sans permission.
      setCopyError('Copie refusée par le navigateur. Sélectionnez le texte manuellement.');
    }
  };

  const mailtoHref = (() => {
    const subject = 'Vos identifiants MORACare';
    const body = [
      `Bonjour ${credentials.fullName},`,
      '',
      credentials.establishmentName
        ? `Votre accès MORACare pour « ${credentials.establishmentName} » est prêt.`
        : 'Votre accès MORACare est prêt.',
      '',
      `Identifiant : ${credentials.username}`,
      `Mot de passe : ${credentials.password}`,
      '',
      'Ce mot de passe est temporaire : il vous sera demandé de le remplacer dès',
      'votre première connexion. Ne le communiquez à personne.',
      '',
      '— MORA Shawiri',
    ].join('\n');

    return `mailto:${encodeURIComponent(credentials.email)}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  })();

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-200/90">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <span>
          Ce mot de passe ne sera plus jamais affiché. Copiez-le ou envoyez-le maintenant ; il
          faudra sinon en générer un nouveau.
        </span>
      </div>

      <dl className="space-y-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Identifiant
          </dt>
          <dd className="mt-1 break-all font-mono text-sm text-white">{credentials.username}</dd>
        </div>

        <div className="rounded-xl border border-mora-green/40 bg-slate-950 p-3">
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Mot de passe temporaire
          </dt>
          <dd className="mt-1 flex flex-wrap items-center gap-3">
            <span className="break-all font-mono text-lg font-bold tracking-wide text-mora-green">
              {credentials.password}
            </span>
            <button
              type="button"
              onClick={() => void copy(credentials.password, 'password')}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition-colors hover:bg-slate-700"
            >
              {copied === 'password' ? (
                <>
                  <Check className="h-3.5 w-3.5 text-mora-green" /> Copié
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copier
                </>
              )}
            </button>
          </dd>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Destinataire
          </dt>
          <dd className="mt-1 break-all text-sm text-slate-300">{credentials.email}</dd>
        </div>
      </dl>

      {copyError && <p className="text-[11px] text-amber-400">{copyError}</p>}

      {credentials.emailSent ? (
        <p className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-[11px] text-emerald-300">
          <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Ces identifiants ont déjà été envoyés automatiquement à {credentials.email}.</span>
        </p>
      ) : (
        <p className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3 text-[11px] text-slate-400">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <span>
            L&apos;envoi automatique n&apos;a pas eu lieu. Transmettez ces identifiants
            vous-même, par un canal sûr.
          </span>
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <a
          href={mailtoHref}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-mora-green px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-mora-green/90"
        >
          <Mail className="h-4 w-4" /> Envoyer par e-mail
        </a>
        <Button
          variant="outline"
          onClick={() => void copy(summary, 'all')}
          className="flex-1 gap-2 py-2.5"
        >
          {copied === 'all' ? (
            <>
              <Check className="h-4 w-4 text-mora-green" /> Copié
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" /> Tout copier
            </>
          )}
        </Button>
      </div>

      <Button variant="ghost" onClick={onClose} className="w-full py-2.5">
        J&apos;ai noté le mot de passe
      </Button>
    </div>
  );
};
