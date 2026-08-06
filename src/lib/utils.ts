import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatage monétaire de l'application.
 *
 * Le code ISO est affiché tel quel. Une version antérieure remplaçait « KMF »
 * par « FC » : les deux désignent bien le franc comorien, mais l'abréviation
 * locale est ambiguë — elle sert aussi au franc congolais — et surtout elle
 * contredisait les tarifs de la vitrine, libellés en KMF. Un même montant
 * s'affichait donc sous deux unités selon l'écran.
 */
export function formatCurrency(amount: number, currency: string = 'KMF'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}
