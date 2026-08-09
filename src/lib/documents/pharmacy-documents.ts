import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import type { DocumentPayload } from '@/lib/documents/pdf';
import type { Dispensation } from '@/services/pharmacy.service';
import type {
  PurchaseOrder,
  PurchaseReceipt,
  StockTransfer,
  SupplierReturn,
} from '@/services/procurement.service';
import { QUALITY_LABELS } from '@/services/procurement.service';
import type { TherapeuticPlan, WardRound } from '@/services/therapeutic.service';
import {
  ADMINISTRATION_STATUS_LABELS,
  TREATMENT_TYPES,
} from '@/services/therapeutic.service';

/**
 * Documents de la pharmacie, des achats et de la logistique.
 *
 * La composition vit ici plutôt que dans les écrans : un même document peut
 * être édité depuis plusieurs endroits, et deux compositions concurrentes
 * finiraient par présenter les mêmes chiffres différemment. L'habillage —
 * en-tête, logo, couleurs, signature, cachet, modèle — vient de la
 * configuration documentaire de l'établissement et n'est pas décidé ici.
 */

const treatmentLabel = (value: string): string =>
  TREATMENT_TYPES.find((entry) => entry.value === value)?.label ?? value;

// ---------------------------------------------------------------------------
// Vente et délivrance (BP19 §10)
// ---------------------------------------------------------------------------

/** Reçu de vente au comptoir. */
export const buildSaleReceipt = (sale: Dispensation, currency: string): DocumentPayload => {
  const balance = Math.max(0, sale.totalAmount - sale.paidAmount);

  return {
    kind: 'receipt',
    reference: sale.reference,
    title: 'Reçu de vente',
    subtitle: `Vente du ${formatDate(sale.dispensedAt)}`,
    highlight: [
      { label: 'Client', value: sale.patientName ?? sale.customerName ?? 'Client de passage' },
      { label: 'Pharmacie', value: sale.pharmacyName ?? '—' },
      { label: 'Montant', value: formatCurrency(sale.totalAmount, currency) },
      { label: 'Règlement', value: sale.paymentMethod ?? '—' },
    ],
    sections: [
      {
        title: 'Produits délivrés',
        table: {
          columns: ['Médicament', 'Lot', 'Quantité', 'Prix unitaire', 'Total'],
          rows: sale.lines.map((line) => [
            line.itemName,
            line.lotNumber ?? '—',
            String(line.quantity),
            formatCurrency(line.unitPrice, currency),
            formatCurrency(line.quantity * line.unitPrice, currency),
          ]),
        },
      },
      {
        title: 'Règlement',
        fields: [
          { label: 'Date et heure', value: formatDateTime(sale.dispensedAt) },
          { label: 'Mode de paiement', value: sale.paymentMethod ?? '—' },
          { label: 'Montant total', value: formatCurrency(sale.totalAmount, currency) },
          { label: 'Montant encaissé', value: formatCurrency(sale.paidAmount, currency) },
          { label: 'Reste dû', value: formatCurrency(balance, currency) },
          { label: 'Servi par', value: sale.dispensedByName ?? '—' },
        ],
      },
      ...(sale.lines.some((line) => line.posology)
        ? [
            {
              title: 'Posologie remise',
              fields: sale.lines
                .filter((line) => line.posology)
                .map((line) => ({ label: line.itemName, value: line.posology as string })),
            },
          ]
        : []),
      ...(sale.notes?.trim() ? [{ title: 'Observations', paragraphs: [sale.notes] }] : []),
    ],
    total: { label: 'Total réglé', value: formatCurrency(sale.paidAmount, currency) },
    note:
      balance > 0
        ? `Reste à régler : ${formatCurrency(balance, currency)}.`
        : 'Conservez ce reçu : il atteste des lots qui vous ont été remis.',
  };
};

// ---------------------------------------------------------------------------
// Plans thérapeutiques (BP19 §6)
// ---------------------------------------------------------------------------

export const buildTherapeuticPlanDocument = (plan: TherapeuticPlan): DocumentPayload => ({
  kind: 'prescription',
  reference: plan.reference,
  title: 'Plan thérapeutique',
  subtitle: `${plan.label} — depuis le ${formatDate(plan.startedOn)}`,
  highlight: [
    { label: 'Patient', value: plan.patientName },
    { label: 'Praticien', value: plan.doctorName ?? '—' },
    { label: 'Indication', value: plan.indication ?? '—' },
    { label: 'Début', value: formatDate(plan.startedOn) },
  ],
  sections: [
    {
      title: 'Traitements prescrits',
      table: {
        columns: ['Médicament', 'Nature', 'Dosage', 'Voie', 'Fréquence', 'Durée'],
        rows: plan.lines.map((line) => [
          line.medicationLabel,
          treatmentLabel(line.treatmentType),
          line.dosage ?? '—',
          line.route ?? '—',
          line.frequency ?? '—',
          line.isContinuous
            ? 'Continu'
            : line.durationDays
              ? `${line.durationDays} jour(s)`
              : '—',
        ]),
      },
    },
    ...(plan.lines.some((line) => line.administrationTimes.length > 0)
      ? [
          {
            title: 'Horaires d’administration',
            fields: plan.lines
              .filter((line) => line.administrationTimes.length > 0)
              .map((line) => ({
                label: line.medicationLabel,
                value: line.administrationTimes.join(' · '),
              })),
          },
        ]
      : []),
    ...(plan.lines.some((line) => line.instructions)
      ? [
          {
            title: 'Consignes',
            fields: plan.lines
              .filter((line) => line.instructions)
              .map((line) => ({
                label: line.medicationLabel,
                value: line.instructions as string,
              })),
          },
        ]
      : []),
    ...(plan.notes?.trim() ? [{ title: 'Observations', paragraphs: [plan.notes] }] : []),
  ],
  note: 'Ce plan est susceptible d’évoluer selon la réévaluation médicale. Ne pas modifier les doses sans avis du praticien.',
});

// ---------------------------------------------------------------------------
// Dispensation hospitalière (BP19 §11)
// ---------------------------------------------------------------------------

export const buildWardRoundDocument = (round: WardRound): DocumentPayload => ({
  kind: 'dispensation',
  reference: round.reference,
  title: 'Feuille de tournée',
  subtitle: `${formatDate(round.roundDate)} — tournée du ${round.slot}`,
  highlight: [
    { label: 'Service', value: round.service ?? 'Tous services' },
    { label: 'Pharmacie', value: round.pharmacyName ?? '—' },
    { label: 'Préparée par', value: round.preparedByName ?? '—' },
    { label: 'Avancement', value: `${round.doneCount} / ${round.totalCount}` },
  ],
  sections: [
    {
      title: 'Administrations prévues',
      table: {
        columns: ['Patient', 'Chambre / lit', 'Médicament', 'Quantité', 'État'],
        rows: round.administrations.map((entry) => [
          entry.patientName,
          [entry.roomCode, entry.bedCode].filter(Boolean).join(' — ') || '—',
          entry.medicationLabel,
          String(entry.quantity),
          ADMINISTRATION_STATUS_LABELS[entry.status] ?? entry.status,
        ]),
      },
    },
    ...(round.notes?.trim() ? [{ title: 'Consignes de tournée', paragraphs: [round.notes] }] : []),
  ],
  note: 'Chaque administration constatée est enregistrée dans le dossier médical du patient.',
});

// ---------------------------------------------------------------------------
// Achats (BP17)
// ---------------------------------------------------------------------------

export const buildPurchaseOrderDocument = (
  order: PurchaseOrder,
  currency: string,
): DocumentPayload => {
  const linesTotal = order.lines.reduce(
    (sum, line) => sum + line.quantityOrdered * line.unitPrice,
    0,
  );

  return {
    kind: 'quote',
    reference: order.reference,
    title: 'Bon de commande',
    subtitle: `Commande du ${formatDate(order.orderedOn)}`,
    highlight: [
      { label: 'Fournisseur', value: order.supplierName },
      { label: 'Livraison attendue', value: order.expectedOn ? formatDate(order.expectedOn) : '—' },
      { label: 'Magasin de réception', value: order.pharmacyName ?? '—' },
      { label: 'Montant', value: formatCurrency(order.totalAmount, currency) },
    ],
    sections: [
      {
        title: 'Articles commandés',
        table: {
          columns: ['Désignation', 'Quantité', 'Prix unitaire', 'Montant'],
          rows: order.lines.map((line) => [
            line.itemName,
            String(line.quantityOrdered),
            formatCurrency(line.unitPrice, currency),
            formatCurrency(line.quantityOrdered * line.unitPrice, currency),
          ]),
        },
      },
      {
        title: 'Récapitulatif',
        fields: [
          { label: 'Total des articles', value: formatCurrency(linesTotal, currency) },
          { label: 'Taxes', value: formatCurrency(order.taxAmount, currency) },
          { label: 'Frais de transport', value: formatCurrency(order.shippingCost, currency) },
          {
            label: 'Remise',
            value:
              order.discountAmount > 0
                ? `− ${formatCurrency(order.discountAmount, currency)}`
                : 'Aucune',
          },
          { label: 'Montant à régler', value: formatCurrency(order.totalAmount, currency) },
        ],
      },
      {
        title: 'Conditions',
        fields: [
          { label: 'Mode de livraison', value: order.deliveryMode ?? '—' },
          { label: 'Conditions de paiement', value: order.paymentTerms ?? '—' },
          { label: 'Priorité', value: order.priority },
        ],
      },
      ...(order.notes?.trim() ? [{ title: 'Observations', paragraphs: [order.notes] }] : []),
    ],
    total: { label: 'Total de la commande', value: formatCurrency(order.totalAmount, currency) },
    note: 'Toute livraison doit être accompagnée du bon de livraison portant cette référence.',
  };
};

export const buildReceiptDocument = (
  receipt: PurchaseReceipt,
  currency: string,
): DocumentPayload => ({
  kind: 'receipt',
  reference: receipt.reference,
  title: 'Bon de réception',
  subtitle: `Réception du ${formatDate(receipt.receivedOn)}`,
  highlight: [
    { label: 'Fournisseur', value: receipt.supplierName },
    { label: 'Bon de commande', value: receipt.orderReference },
    { label: 'Magasin', value: receipt.pharmacyName ?? '—' },
    {
      label: 'Contrôle qualité',
      value: receipt.qualityResult ? QUALITY_LABELS[receipt.qualityResult] : 'À contrôler',
    },
  ],
  sections: [
    {
      title: 'Marchandises reçues',
      table: {
        columns: ['Désignation', 'Quantité', 'N° de lot', 'Péremption', 'Prix unitaire'],
        rows: receipt.lines.map((line) => [
          line.itemName,
          String(line.quantityReceived),
          line.lotNumber ?? '—',
          line.expiresOn ? formatDate(line.expiresOn) : '—',
          formatCurrency(line.unitPrice, currency),
        ]),
      },
    },
    {
      title: 'Contrôle et mise en stock',
      fields: [
        { label: 'Bon de livraison', value: receipt.deliveryNote ?? '—' },
        { label: 'Réceptionné par', value: receipt.receivedByName ?? '—' },
        {
          label: 'Résultat du contrôle',
          value: receipt.qualityResult ? QUALITY_LABELS[receipt.qualityResult] : 'En attente',
        },
        { label: 'Contrôlé par', value: receipt.controlledByName ?? '—' },
        {
          label: 'Mise en stock',
          value: receipt.stockedAt ? formatDateTime(receipt.stockedAt) : 'Non effectuée',
        },
      ],
    },
    ...(receipt.qualityNote?.trim()
      ? [{ title: 'Observations du contrôle', paragraphs: [receipt.qualityNote] }]
      : []),
    ...(receipt.notes?.trim() ? [{ title: 'Observations', paragraphs: [receipt.notes] }] : []),
  ],
  note: 'La mise en stock n’intervient qu’après acceptation du contrôle qualité.',
});

export const buildSupplierReturnDocument = (
  entry: SupplierReturn,
  currency: string,
): DocumentPayload => ({
  kind: 'receipt',
  reference: entry.reference,
  title: 'Bon de retour fournisseur',
  subtitle: `Retour du ${formatDate(entry.returnedOn)}`,
  highlight: [
    { label: 'Fournisseur', value: entry.supplierName },
    { label: 'Nature', value: entry.returnType },
    { label: 'Avoir attendu', value: formatCurrency(entry.creditAmount, currency) },
    { label: 'Expédié', value: entry.postedAt ? formatDate(entry.postedAt) : 'Non' },
  ],
  sections: [
    {
      title: 'Articles retournés',
      table: {
        columns: ['Désignation', 'N° de lot', 'Quantité', 'Prix unitaire', 'Montant'],
        rows: entry.lines.map((line) => [
          line.itemName,
          line.lotNumber ?? '—',
          String(line.quantity),
          formatCurrency(line.unitPrice, currency),
          formatCurrency(line.quantity * line.unitPrice, currency),
        ]),
      },
    },
    { title: 'Motif du retour', paragraphs: [entry.reason] },
  ],
  total: { label: 'Avoir attendu', value: formatCurrency(entry.creditAmount, currency) },
  note: 'Merci de nous adresser l’avoir correspondant à ce retour.',
});

// ---------------------------------------------------------------------------
// Logistique interne (BP18 §12)
// ---------------------------------------------------------------------------

export const buildTransferDocument = (transfer: StockTransfer): DocumentPayload => ({
  kind: 'dispensation',
  reference: transfer.reference,
  title: 'Bon de transfert interne',
  subtitle: `Demandé le ${formatDate(transfer.requestedOn)}`,
  highlight: [
    { label: 'Magasin d’origine', value: transfer.fromPharmacyName },
    { label: 'Magasin destinataire', value: transfer.toPharmacyName },
    {
      label: 'Expédition',
      value: transfer.shippedAt ? formatDate(transfer.shippedAt) : 'Non expédié',
    },
    {
      label: 'Réception',
      value: transfer.receivedAt ? formatDate(transfer.receivedAt) : 'En attente',
    },
  ],
  sections: [
    {
      title: 'Articles transférés',
      table: {
        columns: ['Désignation', 'N° de lot', 'Demandé', 'Expédié'],
        rows: transfer.lines.map((line) => [
          line.itemName,
          line.lotNumber ?? '—',
          String(line.quantityRequested),
          String(line.quantityShipped),
        ]),
      },
    },
    ...(transfer.notes?.trim() ? [{ title: 'Observations', paragraphs: [transfer.notes] }] : []),
  ],
  note: 'Ce bon accompagne la marchandise. Le magasin destinataire en accuse réception à l’arrivée.',
});
