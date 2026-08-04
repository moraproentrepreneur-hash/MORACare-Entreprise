'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Send, Sparkles, Tag } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  listPaymentMethods,
  listPlanDurations,
  type PaymentMethod,
  type PlanDuration,
  type PublicPlan,
} from '@/services/subscription.service';
import type { FallbackPlan } from './landing-content';
import { FALLBACK_PLAN_DURATIONS, FALLBACK_PAYMENT_METHODS } from './landing-content';

/**
 * Formulaire de demande, propre à l'offre choisie.
 *
 * Le visiteur ne sélectionne jamais l'offre : il a cliqué sur une carte, elle
 * est donc connue. Lui redemander reviendrait à douter de son geste et à
 * ouvrir la porte à une incohérence entre ce qu'il a vu et ce qu'il demande.
 *
 * Le tarif est recalculé à chaque changement de durée, à partir de la grille
 * lue en base. Aucun montant n'est saisi ni deviné côté visiteur : ce qui est
 * affiché est exactement ce qui sera enregistré dans la demande.
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

const formatAmount = (amount: number, currency: string): string =>
  `${new Intl.NumberFormat('fr-FR').format(amount)} ${currency}`;

/** Premier jour du mois suivant, au format attendu par un champ date. */
const firstDayNextMonth = (): string => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10);
};

const today = (): string => new Date().toISOString().slice(0, 10);

export const PlanRequestModal: React.FC<PlanRequestModalProps> = ({ plan, onClose }) => {
  const [durations, setDurations] = useState<PlanDuration[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    establishment_name: '',
    establishment_type: 'clinique',
    message: '',
    payment_method: '',
    start_option: 'immediate' as (typeof START_OPTIONS)[number]['value'],
    start_date: firstDayNextMonth(),
  });
  const [months, setMonths] = useState(1);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState('');

  // Les formules gratuites n'ont ni durée ni paiement à choisir.
  const isPaid = plan ? plan.priceAmount > 0 : false;

  useEffect(() => {
    if (!plan) return;

    let cancelled = false;

    listPlanDurations()
      .then((result) => {
        if (!cancelled) setDurations(result.length > 0 ? result : FALLBACK_PLAN_DURATIONS.slice());
      })
      .catch(() => {
        if (!cancelled) setDurations(FALLBACK_PLAN_DURATIONS.slice());
      });

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

  const planDurations = useMemo(
    () => durations.filter((entry) => entry.planCode === plan?.code).sort((a, b) => a.months - b.months),
    [durations, plan],
  );

  const selected = useMemo(
    () => planDurations.find((entry) => entry.months === months) ?? null,
    [planDurations, months],
  );

  if (!plan) return null;

  const currency = plan.priceCurrency;
  const monthlyPrice = selected?.monthlyPrice ?? plan.priceAmount;
  const totalPrice = selected?.totalPrice ?? plan.priceAmount;
  const totalSavings = selected?.totalSavings ?? 0;

  const startLabel =
    form.start_option === 'immediate'
      ? 'Dès validation'
      : form.start_option === 'next_month'
        ? `Début du mois prochain (${new Date(firstDayNextMonth()).toLocaleDateString('fr-FR')})`
        : new Date(form.start_date).toLocaleDateString('fr-FR');

  const paymentLabel = methods.find((method) => method.code === form.payment_method)?.label ?? '—';

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
      setForm({
        full_name: '',
        email: '',
        phone: '',
        establishment_name: '',
        establishment_type: 'clinique',
        message: '',
        payment_method: '',
        start_option: 'immediate',
        start_date: firstDayNextMonth(),
      });
    }, 250);
  };

  const field =
    'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-mora-green';

  return (
    <Modal
      isOpen={plan !== null}
      onClose={handleClose}
      title={`Formule ${plan.name}`}
      description={
        isPaid
          ? 'Choisissez votre durée, votre mode de paiement et votre date de démarrage.'
          : 'Renseignez votre établissement pour que nous préparions votre accès.'
      }
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

          {/* L'offre est imposée : elle est rappelée, jamais choisie. */}
          <div className="rounded-xl border border-mora-green/40 bg-mora-green/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-black text-white">
                <Tag className="h-4 w-4 text-mora-green" /> Formule {plan.name}
              </span>
              <span className="text-sm font-bold text-mora-green">
                {plan.priceAmount === 0
                  ? 'Gratuit'
                  : `${formatAmount(plan.priceAmount, currency)} / mois`}
              </span>
            </div>
            <ul className="mt-3 space-y-1 text-[11px] text-slate-400">
              <li>
                Utilisateurs :{' '}
                <span className="text-slate-200">{plan.maxUsers ?? 'Illimités'}</span>
              </li>
              <li>
                Enregistrements par module :{' '}
                <span className="text-slate-200">{plan.maxRecordsPerModule ?? 'Illimités'}</span>
              </li>
              {plan.durationDays && (
                <li>
                  Durée d&apos;essai : <span className="text-slate-200">{plan.durationDays} jours</span>
                </li>
              )}
              {plan.requiresApproval && (
                <li className="text-amber-400">Activation soumise à validation</li>
              )}
              <li>Tous les modules inclus</li>
            </ul>
          </div>

          {/* Durée — offres payantes uniquement */}
          {isPaid && planDurations.length > 0 && (
            <div>
              <label htmlFor="pr-months" className="mb-1.5 block text-xs font-semibold text-slate-300">
                Durée de l&apos;abonnement *
              </label>
              <select
                id="pr-months"
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
                className={field}
              >
                {planDurations.map((entry) => (
                  <option key={entry.months} value={entry.months}>
                    {entry.months} mois — {formatAmount(entry.monthlyPrice, currency)} / mois
                    {entry.monthlySavings > 0
                      ? ` (économie ${formatAmount(entry.monthlySavings, currency)} / mois)`
                      : ''}
                  </option>
                ))}
              </select>

              {totalSavings > 0 && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-mora-green/10 px-2.5 py-1.5 text-[11px] font-semibold text-mora-green">
                  <Sparkles className="h-3.5 w-3.5" />
                  Vous économisez {formatAmount(totalSavings, currency)} sur {months} mois
                </p>
              )}
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
              <select
                id="pr-type"
                value={form.establishment_type}
                onChange={(e) => setForm({ ...form, establishment_type: e.target.value })}
                className={field}
              >
                {ESTABLISHMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Paiement — offres payantes uniquement */}
          {isPaid && (
            <div>
              <label htmlFor="pr-pay" className="mb-1.5 block text-xs font-semibold text-slate-300">
                Mode de paiement *
              </label>
              <select
                id="pr-pay"
                required
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                className={field}
              >
                <option value="">— Sélectionner —</option>
                {methods.map((method) => (
                  <option key={method.code} value={method.code}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pr-start" className="mb-1.5 block text-xs font-semibold text-slate-300">
                Date souhaitée de démarrage *
              </label>
              <select
                id="pr-start"
                value={form.start_option}
                onChange={(e) =>
                  setForm({
                    ...form,
                    start_option: e.target.value as typeof form.start_option,
                  })
                }
                className={field}
              >
                {START_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
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

          {/* Récapitulatif — ce qui sera enregistré, tel quel. */}
          <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Récapitulatif
            </h4>
            <dl className="mt-3 space-y-2 text-xs">
              <Row label="Offre" value={plan.name} />
              {isPaid && <Row label="Durée" value={`${months} mois`} />}
              <Row
                label="Prix mensuel"
                value={monthlyPrice === 0 ? 'Gratuit' : formatAmount(monthlyPrice, currency)}
              />
              {/*
                Deux économies coexistent et se confondent facilement : celle
                par mois, annoncée dans le sélecteur de durée, et celle sur
                toute la période, seule pertinente ici. Le libellé lève
                l'ambiguïté plutôt que de laisser le visiteur additionner.
              */}
              {isPaid && totalSavings > 0 && (
                <Row
                  label="Économie totale"
                  value={formatAmount(totalSavings, currency)}
                  tone="text-mora-green"
                />
              )}
              {isPaid && <Row label="Mode de paiement" value={paymentLabel} />}
              <Row label="Date de démarrage" value={startLabel} />
              <div className="flex items-center justify-between gap-3 border-t border-slate-800 pt-2">
                <dt className="font-bold text-slate-300">Total</dt>
                <dd className="text-base font-black text-mora-green">
                  {totalPrice === 0 ? 'Gratuit' : formatAmount(totalPrice, currency)}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
              Ce récapitulatif est transmis tel quel avec votre demande. Aucun paiement n&apos;est
              effectué à cette étape : notre équipe vous contacte pour le finaliser.
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
