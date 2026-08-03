'use client';

import React, { useState } from 'react';
import { CheckCircle2, MessageCircle, Send } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { CONTACT_INFO } from './legal-content';

/**
 * Formulaire Contact / Support de la vitrine.
 *
 * Deux effets à l'envoi :
 *   1. la demande est enregistrée en base et apparaît dans « Prises de contact » ;
 *   2. un message WhatsApp prérempli est proposé vers le numéro de MORA Shawiri.
 *
 * L'ouverture de WhatsApp n'est jamais automatique : un `window.open` déclenché
 * sans geste de l'utilisateur est bloqué par les navigateurs, et forcer une
 * application tierce serait intrusif. Le lien est donc présenté, prêt à l'emploi.
 */

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Sujet prérempli, selon le lien du pied de page ayant ouvert la fenêtre. */
  defaultSubject?: string;
}

const buildWhatsAppLink = (form: {
  full_name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  reference: string;
}): string => {
  const lines = [
    'Nouvelle prise de contact — MORACare',
    '',
    `Référence : ${form.reference}`,
    `Nom : ${form.full_name}`,
    `E-mail : ${form.email}`,
    form.phone ? `Téléphone : ${form.phone}` : null,
    `Sujet : ${form.subject}`,
    '',
    'Message :',
    form.message,
  ].filter(Boolean);

  return `https://wa.me/${CONTACT_INFO.whatsappNumber}?text=${encodeURIComponent(lines.join('\n'))}`;
};

export const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  onClose,
  defaultSubject = '',
}) => {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    subject: defaultSubject,
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [whatsappLink, setWhatsappLink] = useState('');
  const [reference, setReference] = useState('');

  // Le sujet suit le lien cliqué tant que le visiteur n'a rien saisi.
  React.useEffect(() => {
    if (isOpen && status === 'idle') {
      setForm((f) => (f.subject ? f : { ...f, subject: defaultSubject }));
    }
  }, [isOpen, defaultSubject, status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setError(null);

    try {
      const response = await fetch('/api/contact-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; reference?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Votre message n'a pas pu être enregistré.");
      }

      const ref = payload?.reference ?? '';
      setReference(ref);
      setWhatsappLink(buildWhatsAppLink({ ...form, reference: ref }));
      setStatus('sent');
    } catch (err) {
      setStatus('idle');
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    }
  };

  const handleClose = () => {
    onClose();
    // Réinitialisation différée : évite que le formulaire se vide à l'écran
    // pendant l'animation de fermeture.
    setTimeout(() => {
      setStatus('idle');
      setError(null);
      setForm({ full_name: '', email: '', phone: '', subject: '', message: '' });
    }, 250);
  };

  const field =
    'w-full px-3 py-2.5 text-sm rounded-lg border border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-mora-green';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Nous contacter"
      description={`Notre équipe vous répond. Vous pouvez aussi nous joindre au ${CONTACT_INFO.phone}.`}
    >
      {status === 'sent' ? (
        <div className="space-y-5 py-4 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-mora-green">
            <CheckCircle2 className="h-9 w-9" />
          </span>
          <div>
            <h4 className="text-lg font-bold text-white">Votre message est enregistré</h4>
            {reference && (
              <p className="mt-1 font-mono text-xs text-mora-green">Référence {reference}</p>
            )}
            <p className="mt-2 text-sm text-slate-400">
              Vous pouvez également nous l&apos;envoyer directement sur WhatsApp — le message est
              déjà prérempli.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#20bd5a]"
            >
              <MessageCircle className="h-4 w-4" />
              Envoyer sur WhatsApp
            </a>
            <button
              onClick={handleClose}
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800"
            >
              Fermer
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ct-name" className="mb-1 block text-xs font-semibold text-slate-300">
                Nom complet *
              </label>
              <input
                id="ct-name"
                type="text"
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className={field}
              />
            </div>
            <div>
              <label htmlFor="ct-phone" className="mb-1 block text-xs font-semibold text-slate-300">
                Téléphone
              </label>
              <input
                id="ct-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+269 ..."
                className={field}
              />
            </div>
          </div>

          <div>
            <label htmlFor="ct-email" className="mb-1 block text-xs font-semibold text-slate-300">
              Email *
            </label>
            <input
              id="ct-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={field}
            />
          </div>

          <div>
            <label htmlFor="ct-subject" className="mb-1 block text-xs font-semibold text-slate-300">
              Sujet *
            </label>
            <input
              id="ct-subject"
              type="text"
              required
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Demande d'information, support, partenariat…"
              className={field}
            />
          </div>

          <div>
            <label htmlFor="ct-message" className="mb-1 block text-xs font-semibold text-slate-300">
              Message *
            </label>
            <textarea
              id="ct-message"
              required
              rows={4}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className={field}
            />
          </div>

          <button
            type="submit"
            disabled={status === 'sending'}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-mora-green py-3 text-sm font-bold text-white shadow-lg shadow-mora-green/25 transition-colors hover:bg-mora-green/90 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {status === 'sending' ? 'Envoi en cours…' : 'Envoyer le message'}
          </button>
        </form>
      )}
    </Modal>
  );
};
