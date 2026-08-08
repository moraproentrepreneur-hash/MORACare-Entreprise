'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Banknote, FileText, Plus, Receipt, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDocument } from '@/hooks/useDocument';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  cancelInvoice,
  cancelPayment,
  issueInvoice,
  listInvoices,
  recordPayment,
  summarise,
  type BillingState,
  type SubscriptionInvoice,
} from '@/services/billing.service';
import { listPaymentMethods, listSubscriptions } from '@/services/subscription.service';
import { Field, FIELD, Metric, Notice } from '@/components/hospitalization/shared';
import { InvoiceTable } from './InvoiceTable';

/**
 * Gestion financière des abonnements — console éditeur (BP30).
 *
 * L'éditeur facture, encaisse et suit les impayés de tous les établissements.
 * Le responsable d'établissement dispose du même tableau, restreint à sa
 * structure et sans action d'écriture : les politiques RLS le lui imposent, et
 * une facture que son destinataire pourrait marquer réglée ne vaudrait rien.
 */

type Scope = 'all' | 'unpaid' | 'overdue' | 'paid';

export const BillingConsole: React.FC = () => {
  const { user } = useAuth();
  const { print, error: documentError } = useDocument();

  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [methods, setMethods] = useState<string[]>([]);
  const [subscriptions, setSubscriptions] = useState<
    { id: string; establishmentName: string; planName: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [scope, setScope] = useState<Scope>('all');
  const [establishment, setEstablishment] = useState('all');
  const [search, setSearch] = useState('');

  const [paying, setPaying] = useState<SubscriptionInvoice | null>(null);
  const [detail, setDetail] = useState<SubscriptionInvoice | null>(null);
  const [issuing, setIssuing] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [loadedInvoices, loadedMethods, loadedSubscriptions] = await Promise.all([
        listInvoices(),
        listPaymentMethods(),
        listSubscriptions(),
      ]);

      setInvoices(loadedInvoices);
      setMethods(loadedMethods.map((method) => method.label));
      setSubscriptions(
        loadedSubscriptions.map((entry) => ({
          id: entry.id,
          establishmentName: entry.establishmentName,
          planName: entry.planName,
        })),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const establishments = useMemo(() => {
    const seen = new Map<string, string>();
    for (const invoice of invoices) seen.set(invoice.establishmentId, invoice.establishmentName);
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1], 'fr'));
  }, [invoices]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const unpaidStates: BillingState[] = ['issued', 'partially_paid', 'overdue'];

    return invoices
      .filter((invoice) => (establishment === 'all' ? true : invoice.establishmentId === establishment))
      .filter((invoice) => {
        if (scope === 'unpaid') return unpaidStates.includes(invoice.status);
        if (scope === 'overdue') return invoice.status === 'overdue';
        if (scope === 'paid') return invoice.status === 'paid';
        return true;
      })
      .filter((invoice) =>
        needle === ''
          ? true
          : `${invoice.reference} ${invoice.establishmentName} ${invoice.planName}`
              .toLowerCase()
              .includes(needle),
      );
  }, [invoices, establishment, scope, search]);

  const totals = useMemo(() => summarise(visible), [visible]);

  const run = async (task: () => Promise<void>, message: string) => {
    setError(null);
    setNotice(null);
    try {
      await task();
      await load();
      setNotice(message);
      setPaying(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'opération a échoué.");
    }
  };

  /** Facture PDF, à l'identité de l'éditeur puisque c'est lui qui facture. */
  const printInvoice = (invoice: SubscriptionInvoice) => {
    void print({
      kind: 'invoice',
      reference: invoice.reference,
      title: "Facture d'abonnement",
      subtitle: `Période du ${formatDate(invoice.periodStart)} au ${formatDate(invoice.periodEnd)}`,
      highlight: [
        { label: 'Établissement', value: invoice.establishmentName },
        { label: 'Formule', value: invoice.planName },
        { label: 'Montant', value: formatCurrency(invoice.totalAmount, invoice.currency) },
        { label: 'Reste dû', value: formatCurrency(invoice.balance, invoice.currency) },
      ],
      sections: [
        {
          title: 'Détail',
          table: {
            columns: ['Désignation', 'Durée', 'Prix mensuel', 'Total'],
            rows: [
              [
                `Abonnement ${invoice.planName}`,
                `${invoice.durationMonths} mois`,
                formatCurrency(invoice.monthlyPrice, invoice.currency),
                formatCurrency(invoice.totalAmount, invoice.currency),
              ],
            ],
          },
        },
        {
          title: 'Conditions',
          fields: [
            { label: 'Émise le', value: formatDate(invoice.issuedOn) },
            { label: 'Échéance', value: invoice.dueOn ? formatDate(invoice.dueOn) : '—' },
            {
              label: 'Prix mensuel normal',
              value: formatCurrency(invoice.baseMonthlyPrice, invoice.currency),
            },
            {
              label: 'Remise accordée',
              value:
                invoice.discountAmount > 0
                  ? formatCurrency(invoice.discountAmount, invoice.currency)
                  : 'Aucune',
            },
            { label: 'Déjà réglé', value: formatCurrency(invoice.paidAmount, invoice.currency) },
          ],
        },
        ...(invoice.payments.length > 0
          ? [
              {
                title: 'Règlements enregistrés',
                table: {
                  columns: ['Date', 'Référence', 'Mode', 'Montant'],
                  rows: invoice.payments.map((payment) => [
                    formatDate(payment.paidOn),
                    payment.reference,
                    payment.paymentMethod,
                    formatCurrency(payment.amount, invoice.currency),
                  ]),
                },
              },
            ]
          : []),
      ],
      note:
        invoice.balance > 0
          ? `Reste à régler : ${formatCurrency(invoice.balance, invoice.currency)}.`
          : 'Facture intégralement réglée. Merci de votre confiance.',
    });
  };

  const actionsFor = (invoice: SubscriptionInvoice): ActionItem[] => [
    { label: 'Consulter le détail', icon: Receipt, onSelect: () => setDetail(invoice) },
    { label: 'Télécharger la facture', icon: FileText, onSelect: () => printInvoice(invoice) },
    {
      label: 'Enregistrer un règlement',
      icon: Banknote,
      disabled: invoice.balance <= 0 || invoice.status === 'canceled',
      onSelect: () => {
        setError(null);
        setPaying(invoice);
      },
    },
    {
      label: 'Annuler la facture',
      icon: XCircle,
      destructive: true,
      disabled: invoice.status === 'canceled' || invoice.paidAmount > 0,
      onSelect: () =>
        void run(() => cancelInvoice(invoice.id, user?.id ?? ''), 'Facture annulée.'),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-white sm:text-xl">
            <Receipt className="h-5 w-5 shrink-0 text-mora-green" /> Finances des abonnements
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Factures, règlements et impayés de tous les établissements.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setIssuing(true)}
          disabled={subscriptions.length === 0}
          className="shrink-0 gap-2"
        >
          <Plus className="h-4 w-4" /> Émettre une facture
        </Button>
      </div>

      {(error || documentError) && <Notice tone="error">{error ?? documentError}</Notice>}
      {notice && <Notice tone="success">{notice}</Notice>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Facturé"
          value={formatCurrency(totals.billed, totals.currency)}
          hint={`${totals.invoiceCount} facture(s)`}
        />
        <Metric
          label="Encaissé"
          value={formatCurrency(totals.collected, totals.currency)}
          tone="good"
        />
        <Metric
          label="Reste dû"
          value={formatCurrency(totals.outstanding, totals.currency)}
          tone={totals.outstanding > 0 ? 'warn' : 'neutral'}
        />
        <Metric
          label="En retard"
          value={formatCurrency(totals.overdueAmount, totals.currency)}
          hint={`${totals.overdueCount} facture(s)`}
          tone={totals.overdueCount > 0 ? 'bad' : 'good'}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <input
          className={FIELD}
          placeholder="Rechercher une facture, un établissement…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          aria-label="Filtrer par établissement"
          value={establishment}
          onChange={setEstablishment}
          options={[
            { value: 'all', label: 'Tous les établissements' },
            ...establishments.map(([id, name]) => ({ value: id, label: name })),
          ]}
        />
        <Select<Scope>
          aria-label="Filtrer par statut"
          value={scope}
          onChange={setScope}
          options={[
            { value: 'all', label: 'Toutes les factures' },
            { value: 'unpaid', label: 'Non soldées' },
            { value: 'overdue', label: 'En retard' },
            { value: 'paid', label: 'Réglées' },
          ]}
        />
      </div>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl border border-slate-800 bg-slate-900" />
      ) : (
        <InvoiceTable
          invoices={visible}
          showEstablishment
          emptyDescription="Les factures sont émises automatiquement à chaque souscription et à chaque renouvellement."
          actionsFor={actionsFor}
        />
      )}

      {issuing && (
        <IssueForm
          subscriptions={subscriptions}
          onCancel={() => setIssuing(false)}
          onSubmit={(subscriptionId) =>
            run(async () => {
              await issueInvoice(subscriptionId, user?.id ?? '');
              setIssuing(false);
            }, 'Facture émise.')
          }
        />
      )}

      {paying && (
        <PaymentForm
          invoice={paying}
          methods={methods}
          onCancel={() => setPaying(null)}
          onSubmit={(input) =>
            run(
              () =>
                recordPayment(
                  {
                    invoiceId: paying.id,
                    establishmentId: paying.establishmentId,
                    ...input,
                  },
                  user?.id ?? '',
                ),
              'Règlement enregistré.',
            )
          }
        />
      )}

      {detail && (
        <InvoiceDetail
          invoice={detail}
          canCancelPayment
          onCancel={() => setDetail(null)}
          onCancelPayment={(paymentId) =>
            run(async () => {
              await cancelPayment(paymentId, user?.id ?? '');
              setDetail(null);
            }, 'Règlement annulé.')
          }
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------

const IssueForm: React.FC<{
  subscriptions: readonly { id: string; establishmentName: string; planName: string }[];
  onCancel: () => void;
  onSubmit: (subscriptionId: string) => Promise<void>;
}> = ({ subscriptions, onCancel, onSubmit }) => {
  const [subscriptionId, setSubscriptionId] = useState(subscriptions[0]?.id ?? '');
  const [isSaving, setIsSaving] = useState(false);

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title="Émettre une facture"
      description="La période en cours de l’abonnement est facturée au tarif de sa formule."
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setIsSaving(true);
          await onSubmit(subscriptionId);
          setIsSaving(false);
        }}
        className="space-y-4"
      >
        <Field
          label="Abonnement *"
          hint="Si la période est déjà facturée, la facture existante est conservée."
        >
          <Select
            required
            value={subscriptionId}
            onChange={setSubscriptionId}
            options={subscriptions.map((entry) => ({
              value: entry.id,
              label: entry.establishmentName,
              hint: entry.planName,
            }))}
          />
        </Field>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
          <Button type="submit" variant="secondary" isLoading={isSaving} className="flex-1 font-bold">
            Émettre
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const PaymentForm: React.FC<{
  invoice: SubscriptionInvoice;
  methods: readonly string[];
  onCancel: () => void;
  onSubmit: (input: {
    amount: number;
    paymentMethod: string;
    transactionReference?: string;
    paidOn: string;
    notes?: string;
  }) => Promise<void>;
}> = ({ invoice, methods, onCancel, onSubmit }) => {
  const [form, setForm] = useState({
    // Le solde est proposé par défaut : c'est le cas de très loin le plus
    // fréquent, et le montant reste modifiable pour un acompte.
    amount: invoice.balance,
    paymentMethod: methods[0] ?? 'Espèces',
    transactionReference: '',
    paidOn: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const excessive = form.amount > invoice.balance;

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title={`Règlement de ${invoice.reference}`}
      description={`${invoice.establishmentName} · reste dû ${formatCurrency(invoice.balance, invoice.currency)}`}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (excessive) return;
          setIsSaving(true);
          await onSubmit(form);
          setIsSaving(false);
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`Montant (${invoice.currency}) *`} htmlFor="pay-amount">
            <input
              id="pay-amount"
              type="number"
              min={1}
              required
              className={FIELD}
              value={form.amount}
              onChange={(event) =>
                setForm({ ...form, amount: Math.max(0, Number(event.target.value) || 0) })
              }
            />
          </Field>
          <Field label="Date du règlement *" htmlFor="pay-date">
            <input
              id="pay-date"
              type="date"
              required
              className={FIELD}
              value={form.paidOn}
              onChange={(event) => setForm({ ...form, paidOn: event.target.value })}
            />
          </Field>
        </div>

        <Field label="Mode de paiement *">
          <Select
            required
            value={form.paymentMethod}
            onChange={(value) => setForm({ ...form, paymentMethod: value })}
            options={(methods.length > 0 ? methods : ['Espèces']).map((entry) => ({
              value: entry,
              label: entry,
            }))}
          />
        </Field>

        <Field label="Référence de la transaction" htmlFor="pay-ref">
          <input
            id="pay-ref"
            className={FIELD}
            placeholder="Numéro de virement, de reçu…"
            value={form.transactionReference}
            onChange={(event) => setForm({ ...form, transactionReference: event.target.value })}
          />
        </Field>

        <Field label="Observations" htmlFor="pay-notes">
          <textarea
            id="pay-notes"
            rows={2}
            className={FIELD}
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />
        </Field>

        {excessive && (
          <Notice tone="error">
            Le montant dépasse le reste dû. Un excédent traduit presque toujours une saisie sur la
            mauvaise facture.
          </Notice>
        )}

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
          <Button
            type="submit"
            variant="secondary"
            isLoading={isSaving}
            disabled={excessive || form.amount <= 0}
            className="flex-1 font-bold"
          >
            Enregistrer
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export const InvoiceDetail: React.FC<{
  invoice: SubscriptionInvoice;
  canCancelPayment: boolean;
  onCancel: () => void;
  onCancelPayment?: (paymentId: string) => Promise<void>;
}> = ({ invoice, canCancelPayment, onCancel, onCancelPayment }) => (
  <Modal
    isOpen
    onClose={onCancel}
    maxWidth="xl"
    title={`Facture ${invoice.reference}`}
    description={`${invoice.establishmentName} · ${invoice.planName}`}
  >
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:grid-cols-3">
        {[
          { label: 'Période', value: `${formatDate(invoice.periodStart)} → ${formatDate(invoice.periodEnd)}` },
          { label: 'Durée', value: `${invoice.durationMonths} mois` },
          { label: 'Prix mensuel normal', value: formatCurrency(invoice.baseMonthlyPrice, invoice.currency) },
          { label: 'Prix mensuel appliqué', value: formatCurrency(invoice.monthlyPrice, invoice.currency) },
          { label: 'Remise', value: formatCurrency(invoice.discountAmount, invoice.currency) },
          { label: 'Total', value: formatCurrency(invoice.totalAmount, invoice.currency) },
          { label: 'Réglé', value: formatCurrency(invoice.paidAmount, invoice.currency) },
          { label: 'Reste dû', value: formatCurrency(invoice.balance, invoice.currency) },
          { label: 'Échéance', value: invoice.dueOn ? formatDate(invoice.dueOn) : '—' },
        ].map((entry) => (
          <div key={entry.label}>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {entry.label}
            </dt>
            <dd className="mt-0.5 text-xs text-slate-200">{entry.value}</dd>
          </div>
        ))}
      </dl>

      <div>
        <h4 className="mb-2 text-xs font-bold text-white">Règlements</h4>
        {invoice.payments.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-500">
            Aucun règlement enregistré à ce jour.
          </p>
        ) : (
          <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950">
            {invoice.payments.map((payment) => (
              <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white">
                    {formatCurrency(payment.amount, invoice.currency)}
                    <span className="ml-2 font-normal text-slate-400">{payment.paymentMethod}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {formatDate(payment.paidOn)} · {payment.reference}
                    {payment.transactionReference && ` · ${payment.transactionReference}`}
                    {payment.recordedByName && ` · ${payment.recordedByName}`}
                  </p>
                </div>
                {canCancelPayment && onCancelPayment && (
                  <button
                    type="button"
                    onClick={() => void onCancelPayment(payment.id)}
                    className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    Annuler
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {invoice.notes && (
        <p className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
          {invoice.notes}
        </p>
      )}
    </div>
  </Modal>
);
