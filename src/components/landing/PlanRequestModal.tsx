'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import {
  computePrice,
  listPaymentMethods,
  pricingRuleOf,
  type PaymentMethod,
  type PublicPlan,
} from '@/services/subscription.service';
import type { FallbackPlan } from './landing-content';
import { FALLBACK_PAYMENT_METHODS } from './landing-content';

/**
 * Formulaire de demande, propre à l'offre choisie.
 *
 * Le visiteur ne sélectionne jamais l'offre : il a cliqué sur une carte, elle
 * est donc connue. Lui redemander reviendrait à douter de son geste et à ouvrir
 * la porte à une incohérence entre ce qu'il a vu et ce qu'il demande.
 *
 * Le formulaire reste sobre : il ne porte que des champs à remplir. Aucun prix,
 * aucune remise, aucun argument commercial n'y figure — le sélecteur de durée
 * propose des mois, rien d'autre. Tout le détail tarifaire est rassemblé dans
 * le récapitulatif, à un seul endroit, juste avant la validation.
 */

type AnyPlan = PublicPlan | FallbackPlan;

interface PlanRequestModalProps {
  plan: AnyPlan | null;
  onClose: () => void;
}

const ESTABLISHMENT_TYPES = [
  { value: 'cabinet', label: 'Cabinet médical' },
  { value: 'clinique', label: 'Clinique' },
  { value: 'centre_medical', label: 'Centre médical' },
  { value: 'hopital', label: 'Hôpital' },
  { value: 'laboratoire', label: 'Laboratoire' },
  { value: 'imagerie', label: "Centre d'imagerie" },
  { value: 'ong', label: 'ONG médicale' },
] as const;

const START_OPTIONS = [
  { value: 'immediate', label: 'Dès validation' },
  { value: 'next_month', label: 'Début du mois prochain' },
  { value: 'custom', label: 'Choisir une date' },
] as const;

type StartValue = (typeof START_OPTIONS)[number]['value'];

const formatAmount = (amount: number, currency: string): string =>
  `${new Intl.NumberFormat('fr-FR').format(amount)} ${currency}`;

/** Premier jour du mois suivant, au format attendu par un champ date. */
const firstDayNextMonth = (): string => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10);
};

const today = (): string => new Date().toISOString().slice(0, 10);

const EMPTY_FORM = {
  full_name: '',
  email: '',
  phone: '',
  establishment_name: '',
  establishment_type: 'clinique',
  message: '',
  payment_method: '',
  start_option: 'immediate' as StartValue,
  start_date: firstDayNextMonth(),
};

export const PlanRequestModal: React.FC<PlanRequestModalProps> = ({ plan, onClose }) => {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [months, setMonths] = useState(1);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState('');

  // Les formules gratuites n'ont ni durée ni paiement à choisir.
  const isPaid = plan ? plan.priceAmount > 0 : false;

  useEffect(() => {
    if (!plan) return;
    let cancelled = false;

    listPaymentMethods()
      .then((result) => {
        if (!cancelled) setMethods(result.length > 0 ? result : FALLBACK_PAYMENT_METHODS.slice());
      })
      .catch(() => {
        if (!cancelled) setMethods(FALLBACK_PAYMENT_METHODS.slice());
      });

    return () => {
      cancelled = true;
    };
  }, [plan]);

  // Réinitialisation à chaque ouverture : une offre choisie ne doit pas hériter
  // de la durée retenue pour la précédente.
  useEffect(() => {
    if (plan) {
      setMonths(1);
      setStatus('idle');
      setError(null);
    }
  }, [plan]);

  const rule = useMemo(() => (plan ? pricingRuleOf(plan) : null), [plan]);
  const breakdown = useMemo(
    () => (rule ? computePrice(rule, months) : null),
    [rule, months],
  );

  /** Simples durées, sans tarif : le calcul est réservé au récapitulatif. */
  const durationOptions = useMemo(() => {
    const max = plan?.maxDurationMonths ?? 12;
    return Array.from({ length: max }, (_, index) => ({
      value: String(index + 1),
      label: index === 0 ? '1 mois' : `${index + 1} mois`,
    }));
  }, [plan]);

  if (!plan || !breakdown) return null;

  const currency = plan.priceCurrency;
  const paymentLabel = methods.find((method) => method.code === form.payment_method)?.label ?? '—';

  const startLabel =
    form.start_option === 'immediate'
      ? 'Dès validation'
      : form.start_option === 'next_month'
        ? new Date(firstDayNextMonth()).toLocaleDateString('fr-FR')
        : new Date(form.start_date).toLocaleDateString('fr-FR');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setError(null);

    try {
      const response = await fetch('/api/registration-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          establishment_name: form.establishment_name,
          establishment_type: form.establishment_type,
          message: form.message,
          plan_code: plan.code,
          // Seule la durée est transmise : les montants sont recalculés par le
          // serveur, qui seul fait autorité sur les prix.
          duration_months: isPaid ? months : null,
          payment_method: isPaid ? form.payment_method : null,
          start_option: form.start_option,
          start_date: form.start_option === 'custom' ? form.start_date : null,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; reference?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Votre demande n'a pas pu être enregistrée.");
      }

      setReference(payload?.reference ?? '');
      setStatus('sent');
    } catch (err) {
      setStatus('idle');
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStatus('idle');
      setError(null);
      setForm(EMPTY_FORM);
    }, 250);
  };

  const field =
    'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-mora-green';

  return (
    <Modal
      isOpen={plan !== null}
      onClose={handleClose}
      title={`Formule ${plan.name}`}
      description="Renseignez vos coordonnées et vos préférences. Le récapitulatif s'affiche avant validation."
      maxWidth="2xl"
    >
      {status === 'sent' ? (
        <div className="space-y-5 py-4 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-mora-green">
            <CheckCircle2 className="h-9 w-9" />
          </span>
          <div>
            <h4 className="text-lg font-bold text-white">Votre demande est enregistrée</h4>
            {reference && (
              <p className="mt-1 font-mono text-xs text-mora-green">Référence {reference}</p>
            )}
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Notre équipe vous contacte pour confirmer la formule {plan.name}
              {isPaid ? ` sur ${months} mois` : ''} et organiser la mise en service.
            </p>
          </div>
          <Button variant="secondary" onClick={handleClose} className="w-full py-2.5 font-bold">
            Fermer
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pr-name" className="mb-1.5 block text-xs font-semibold text-slate-300">
                Nom complet *
              </label>
              <input
                id="pr-name"
                type="text"
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className={field}
              />
            </div>
            <div>
              <label htmlFor="pr-phone" className="mb-1.5 block text-xs font-semibold text-slate-300">
                Téléphone *
              </label>
              <input
                id="pr-phone"
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+269 ..."
                className={field}
              />
            </div>
          </div>

          <div>
            <label htmlFor="pr-email" className="mb-1.5 block text-xs font-semibold text-slate-300">
              E-mail professionnel *
            </label>
            <input
              id="pr-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={field}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pr-est" className="mb-1.5 block text-xs font-semibold text-slate-300">
                Nom de l&apos;établissement *
              </label>
              <input
                id="pr-est"
                type="text"
                required
                value={form.establishment_name}
                onChange={(e) => setForm({ ...form, establishment_name: e.target.value })}
                className={field}
              />
            </div>
            <div>
              <label htmlFor="pr-type" className="mb-1.5 block text-xs font-semibold text-slate-300">
                Type d&apos;établissement
              </label>
              <Select
                id="pr-type"
                value={form.establishment_type}
                onChange={(value) => setForm({ ...form, establishment_type: value })}
                options={ESTABLISHMENT_TYPES.map((type) => ({
                  value: type.value,
                  label: type.label,
                }))}
              />
            </div>
          </div>

          {isPaid && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="pr-months"
                  className="mb-1.5 block text-xs font-semibold text-slate-300"
                >
                  Durée de l&apos;abonnement *
                </label>
                <Select
                  id="pr-months"
                  value={String(months)}
                  onChange={(value) => setMonths(Number(value))}
                  options={durationOptions}
                />
              </div>
              <div>
                <label htmlFor="pr-pay" className="mb-1.5 block text-xs font-semibold text-slate-300">
                  Mode de paiement *
                </label>
                <Select
                  id="pr-pay"
                  name="payment_method"
                  required
                  value={form.payment_method}
                  onChange={(value) => setForm({ ...form, payment_method: value })}
                  options={methods.map((method) => ({
                    value: method.code,
                    label: method.label,
                  }))}
                />
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pr-start" className="mb-1.5 block text-xs font-semibold text-slate-300">
                Date souhaitée de démarrage *
              </label>
              <Select<StartValue>
                id="pr-start"
                value={form.start_option}
                onChange={(value) => setForm({ ...form, start_option: value })}
                options={START_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
              />
            </div>

            {form.start_option === 'custom' && (
              <div>
                <label
                  htmlFor="pr-start-date"
                  className="mb-1.5 block text-xs font-semibold text-slate-300"
                >
                  Date précise *
                </label>
                <input
                  id="pr-start-date"
                  type="date"
                  required
                  min={today()}
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className={field}
                />
              </div>
            )}
          </div>

          <div>
            <label htmlFor="pr-msg" className="mb-1.5 block text-xs font-semibold text-slate-300">
              Message (facultatif)
            </label>
            <textarea
              id="pr-msg"
              rows={3}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Nombre de praticiens, besoins particuliers…"
              className={field}
            />
          </div>

          {/* Récapitulatif : seul endroit où figurent les montants. */}
          <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Récapitulatif
            </h4>

            <dl className="mt-3 space-y-2 text-xs">
              <Row label="Formule choisie" value={plan.name} />

              {isPaid ? (
                <>
                  <Row
                    label="Prix mensuel normal"
                    value={formatAmount(breakdown.baseMonthlyPrice, currency)}
                  />
                  <Row
                    label="Prix mensuel après remise"
                    value={formatAmount(breakdown.monthlyPrice, currency)}
                    tone={breakdown.discountApplied ? 'text-mora-green' : undefined}
                  />
                  <Row label="Nombre de mois" value={`${breakdown.months}`} />
                  <Row
                    label="Économie totale"
                    value={formatAmount(breakdown.totalSavings, currency)}
                    tone={breakdown.totalSavings > 0 ? 'text-mora-green' : undefined}
                  />
                  <Row label="Mode de paiement" value={paymentLabel} />
                </>
              ) : (
                <Row label="Prix mensuel" value="Gratuit" />
              )}

              <Row label="Date de démarrage" value={startLabel} />

              <div className="flex items-center justify-between gap-3 border-t border-slate-800 pt-2">
                <dt className="font-bold text-slate-300">Total à payer</dt>
                <dd className="text-base font-black text-mora-green">
                  {breakdown.totalPrice === 0
                    ? 'Gratuit'
                    : formatAmount(breakdown.totalPrice, currency)}
                </dd>
              </div>
            </dl>

            {isPaid && breakdown.discountApplied && (
              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                Le tarif préférentiel s&apos;applique automatiquement à partir de{' '}
                {plan.discountMinMonths} mois.
              </p>
            )}

            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              Aucun paiement n&apos;est effectué à cette étape : notre équipe vous contacte pour le
              finaliser.
            </p>
          </div>

          <Button
            type="submit"
            variant="secondary"
            isLoading={status === 'sending'}
            className="w-full gap-2 py-3 font-bold"
          >
            <Send className="h-4 w-4" />
            Envoyer ma demande
          </Button>
        </form>
      )}
    </Modal>
  );
};

const Row: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone }) => (
  <div className="flex items-center justify-between gap-3">
    <dt className="text-slate-400">{label}</dt>
    <dd className={`text-right font-semibold ${tone ?? 'text-slate-200'}`}>{value}</dd>
  </div>
);
