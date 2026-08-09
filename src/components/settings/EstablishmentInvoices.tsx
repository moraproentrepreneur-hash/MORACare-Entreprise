'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, FileText, Receipt } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDocument } from '@/hooks/useDocument';
import { useBranding } from '@/context/BrandingContext';
import { buildSubscriptionInvoiceDocument } from '@/lib/documents/subscription-invoice';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { formatCurrency } from '@/lib/utils';
import {
  listInvoices,
  summarise,
  type SubscriptionInvoice,
} from '@/services/billing.service';
import { InvoiceTable } from '@/components/billing/InvoiceTable';
import { InvoiceDetail } from '@/components/billing/BillingConsole';
import { Metric, Notice } from '@/components/hospitalization/shared';

/**
 * Factures d'abonnement de l'établissement (BP30 §8, UG02 §17).
 *
 * Consultation et téléchargement seulement. BP30 BR-295 réserve
 * l'administration des abonnements à MORA Shawiri : une facture que son
 * destinataire pourrait marquer réglée ne vaudrait rien. Les politiques RLS
 * n'ouvrent d'ailleurs que la lecture, et sur son seul établissement.
 */
export const EstablishmentInvoices: React.FC = () => {
  const { user } = useAuth();
  const { platform } = useBranding();
  // La facture est émise par MORA Shawiri : elle porte son en-tête, et non
  // celui de l'établissement qui la reçoit.
  const { print, preview, error: documentError } = useDocument(platform);

  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<SubscriptionInvoice | null>(null);

  const load = useCallback(async () => {
    if (!user?.establishment_id) {
      setIsLoading(false);
      return;
    }

    try {
      setInvoices(await listInvoices(user.establishment_id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => summarise(invoices), [invoices]);

  const printInvoice = (invoice: SubscriptionInvoice) =>
    void print(buildSubscriptionInvoiceDocument(invoice));

  const previewInvoice = (invoice: SubscriptionInvoice) =>
    void preview(buildSubscriptionInvoiceDocument(invoice));

  const actionsFor = (invoice: SubscriptionInvoice): ActionItem[] => [
    { label: 'Consulter le détail', icon: Receipt, onSelect: () => setDetail(invoice) },
    { label: 'Aperçu de la facture', icon: Eye, onSelect: () => previewInvoice(invoice) },
    { label: 'Télécharger la facture', icon: FileText, onSelect: () => printInvoice(invoice) },
  ];

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-2xl border border-slate-800 bg-slate-900" />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <h3 className="flex items-center gap-2 text-base font-bold text-white">
          <Receipt className="h-4 w-4 text-mora-green" /> Factures d&apos;abonnement
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Historique de facturation de votre établissement. Les règlements sont enregistrés par
          MORA Shawiri.
        </p>
      </div>

      {(error || documentError) && <Notice tone="error">{error ?? documentError}</Notice>}

      {invoices.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric
            label="Total facturé"
            value={formatCurrency(totals.billed, totals.currency)}
            hint={`${totals.invoiceCount} facture(s)`}
          />
          <Metric
            label="Réglé"
            value={formatCurrency(totals.collected, totals.currency)}
            tone="good"
          />
          <Metric
            label="Reste dû"
            value={formatCurrency(totals.outstanding, totals.currency)}
            tone={totals.overdueCount > 0 ? 'bad' : totals.outstanding > 0 ? 'warn' : 'good'}
            hint={totals.overdueCount > 0 ? `${totals.overdueCount} en retard` : undefined}
          />
        </div>
      )}

      <InvoiceTable
        invoices={invoices}
        showEstablishment={false}
        emptyDescription="Aucune facture n’a encore été émise pour votre abonnement."
        actionsFor={actionsFor}
      />

      {detail && (
        <InvoiceDetail
          invoice={detail}
          canCancelPayment={false}
          onCancel={() => setDetail(null)}
        />
      )}
    </div>
  );
};
