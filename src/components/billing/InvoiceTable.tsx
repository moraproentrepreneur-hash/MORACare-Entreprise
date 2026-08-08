'use client';

import React from 'react';
import { FileText, Receipt } from 'lucide-react';
import { ActionMenu, type ActionItem } from '@/components/ui/ActionMenu';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  BILLING_LABELS,
  BILLING_TONES,
  type SubscriptionInvoice,
} from '@/services/billing.service';
import { Badge, EmptyState, ScrollTable } from '@/components/hospitalization/shared';

/**
 * Tableau des factures d'abonnement.
 *
 * Partagé par la console éditeur et l'espace établissement : les deux
 * présentent la même information, seules les actions diffèrent. Deux tableaux
 * distincts auraient fini par afficher des colonnes différentes pour la même
 * facture, et fait douter du montant.
 */
export const InvoiceTable: React.FC<{
  invoices: readonly SubscriptionInvoice[];
  /** Affiche la colonne Établissement — inutile côté établissement. */
  showEstablishment: boolean;
  emptyDescription: string;
  actionsFor: (invoice: SubscriptionInvoice) => ActionItem[];
}> = ({ invoices, showEstablishment, emptyDescription, actionsFor }) => {
  if (invoices.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <EmptyState icon={Receipt} title="Aucune facture" description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <ScrollTable minWidth={showEstablishment ? 'min-w-[64rem]' : 'min-w-[52rem]'}>
        <thead className="bg-slate-950 font-bold uppercase tracking-wider text-slate-400">
          <tr>
            <th className="p-4">Facture</th>
            {showEstablishment && <th className="p-4">Établissement</th>}
            <th className="p-4">Formule</th>
            <th className="p-4">Période</th>
            <th className="p-4">Montant</th>
            <th className="p-4">Réglé</th>
            <th className="p-4">Reste dû</th>
            <th className="p-4">Échéance</th>
            <th className="p-4">Statut</th>
            <th className="p-4">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="transition-colors hover:bg-slate-800/50">
              <td className="p-4">
                <span className="font-mono font-bold text-mora-green">{invoice.reference}</span>
                <span className="block text-[11px] text-slate-500">
                  Émise le {formatDate(invoice.issuedOn)}
                </span>
              </td>

              {showEstablishment && (
                <td className="p-4 font-bold text-white">{invoice.establishmentName}</td>
              )}

              <td className="p-4">
                {invoice.planName}
                <span className="block text-[11px] text-slate-500">
                  {invoice.durationMonths} mois ×{' '}
                  {formatCurrency(invoice.monthlyPrice, invoice.currency)}
                </span>
              </td>

              <td className="p-4 text-[11px]">
                {formatDate(invoice.periodStart)}
                <span className="block text-slate-500">au {formatDate(invoice.periodEnd)}</span>
              </td>

              <td className="p-4 font-bold text-white">
                {formatCurrency(invoice.totalAmount, invoice.currency)}
                {invoice.discountAmount > 0 && (
                  <span className="block text-[11px] text-mora-green">
                    remise {formatCurrency(invoice.discountAmount, invoice.currency)}
                  </span>
                )}
              </td>

              <td className="p-4">{formatCurrency(invoice.paidAmount, invoice.currency)}</td>

              <td className="p-4">
                <span className={invoice.balance > 0 ? 'font-bold text-amber-400' : 'text-slate-500'}>
                  {formatCurrency(invoice.balance, invoice.currency)}
                </span>
              </td>

              <td className="p-4">{invoice.dueOn ? formatDate(invoice.dueOn) : '—'}</td>

              <td className="p-4">
                <Badge label={BILLING_LABELS[invoice.status]} tone={BILLING_TONES[invoice.status]} />
              </td>

              <td className="p-4">
                <ActionMenu
                  label={`Actions pour la facture ${invoice.reference}`}
                  items={actionsFor(invoice)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </ScrollTable>
    </div>
  );
};

export const InvoiceIcon = FileText;
