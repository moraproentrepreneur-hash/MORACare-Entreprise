import { formatCurrency, formatDate } from '@/lib/utils';
import {
  BILLING_LABELS,
  type SubscriptionInvoice,
} from '@/services/billing.service';
import type { DocumentPayload } from '@/lib/documents/pdf';

/**
 * Facture d'abonnement SaaS (BP30 §8).
 *
 * La composition vit ici, et non dans les écrans : la console de l'éditeur et
 * l'espace de l'établissement produisent la même facture. Deux compositions
 * distinctes auraient fini par afficher des montants présentés différemment
 * pour le même document — de quoi faire douter celui qui paie.
 *
 * L'émetteur est toujours MORA Shawiri, y compris lorsque le responsable
 * télécharge la facture depuis son propre espace : c'est l'éditeur qui facture,
 * et une facture à l'en-tête du client laisserait croire qu'il s'est facturé
 * lui-même.
 */
export const buildSubscriptionInvoiceDocument = (
  invoice: SubscriptionInvoice,
): DocumentPayload => {
  const currency = invoice.currency;
  const customer = invoice.customer;

  const customerLines = [
    customer.legalName || customer.name,
    customer.address,
    [customer.city, customer.country].filter(Boolean).join(', '),
    [customer.phone, customer.email].filter(Boolean).join(' · '),
    [
      customer.tradeRegister ? `RC ${customer.tradeRegister}` : '',
      customer.taxId ? `NIF ${customer.taxId}` : '',
    ]
      .filter(Boolean)
      .join(' · '),
  ].filter((line) => line.trim() !== '');

  return {
    kind: 'invoice',
    reference: invoice.reference,
    title: "Facture d'abonnement",
    subtitle: `Période du ${formatDate(invoice.periodStart)} au ${formatDate(invoice.periodEnd)}`,
    highlight: [
      { label: 'Client', value: customer.name || invoice.establishmentName },
      { label: 'Formule', value: invoice.planName },
      { label: 'Montant total', value: formatCurrency(invoice.totalAmount, currency) },
      { label: 'Reste dû', value: formatCurrency(invoice.balance, currency) },
    ],
    sections: [
      {
        title: 'Client facturé',
        paragraphs: customerLines.length > 0 ? customerLines : ['Coordonnées non renseignées.'],
      },
      {
        title: 'Détail de la prestation',
        table: {
          columns: ['Désignation', 'Durée', 'Prix mensuel', 'Montant'],
          rows: [
            [
              `Abonnement MORACare Enterprise — formule ${invoice.planName}`,
              `${invoice.durationMonths} mois`,
              formatCurrency(invoice.monthlyPrice, currency),
              formatCurrency(invoice.monthlyPrice * invoice.durationMonths, currency),
            ],
          ],
        },
      },
      {
        title: 'Récapitulatif',
        fields: [
          { label: "Date d'émission", value: formatDate(invoice.issuedOn) },
          { label: 'Échéance de règlement', value: invoice.dueOn ? formatDate(invoice.dueOn) : '—' },
          { label: 'Statut', value: BILLING_LABELS[invoice.status] },
          {
            label: 'Prix mensuel normal',
            value: formatCurrency(invoice.baseMonthlyPrice, currency),
          },
          {
            label: 'Remise accordée',
            value:
              invoice.discountAmount > 0
                ? `− ${formatCurrency(invoice.discountAmount, currency)}`
                : 'Aucune',
          },
          { label: 'Montant total', value: formatCurrency(invoice.totalAmount, currency) },
          { label: 'Montant réglé', value: formatCurrency(invoice.paidAmount, currency) },
          { label: 'Reste dû', value: formatCurrency(invoice.balance, currency) },
        ],
      },
      ...(invoice.payments.length > 0
        ? [
            {
              title: 'Règlements enregistrés',
              table: {
                columns: ['Date', 'Référence', 'Mode de paiement', 'Montant'],
                rows: invoice.payments.map((payment) => [
                  formatDate(payment.paidOn),
                  payment.reference,
                  payment.paymentMethod,
                  formatCurrency(payment.amount, currency),
                ]),
              },
            },
          ]
        : []),
      ...(invoice.notes?.trim() ? [{ title: 'Observations', paragraphs: [invoice.notes] }] : []),
    ],
    total: { label: 'Reste à régler', value: formatCurrency(invoice.balance, currency) },
    note:
      invoice.balance > 0
        ? `Règlement attendu ${
            invoice.dueOn ? `avant le ${formatDate(invoice.dueOn)}` : 'à réception'
          }, auprès de MORA Shawiri, éditeur de MORACare Enterprise.`
        : 'Facture intégralement réglée. Nous vous remercions de votre confiance.',
  };
};

// Le nom du fichier est composé par le moteur à partir de la référence métier
// et du titre : `MORA-FSA-000001-facture-d-abonnement.pdf`. Il identifie le
// document sans ambiguïté et reste triable dans un dossier de téléchargements.
