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
  })
    .format(amount)
    // `Intl` sépare les milliers par une espace **fine** insécable (U+202F).
    // Elle est hors du jeu Latin-1, ce qui suffisait à faire basculer toute la
    // chaîne en UTF-16 à l'impression : « 18 000 KMF » sortait « 1 8 0 0 0 ».
    //
    // On la ramène à l'espace insécable ordinaire (U+00A0), qui appartient à
    // Latin-1. Le montant reste insécable à l'écran — il ne se coupe pas en fin
    // de ligne entre « 18 » et « 000 » — et devient imprimable sans dépendre
    // d'aucune transposition en aval.
    .replace(/ /g, ' ');
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
