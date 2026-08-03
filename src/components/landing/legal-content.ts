/**
 * Coordonnées officielles, réseaux sociaux et documents légaux de la vitrine.
 *
 * Regroupés ici pour qu'une coordonnée qui change ne se corrige qu'à un seul
 * endroit — elle apparaît dans le pied de page, le formulaire de contact et le
 * message WhatsApp.
 */

export const CONTACT_INFO = {
  phone: '+269 430 63 06',
  /** Format international sans séparateur, requis par wa.me */
  whatsappNumber: '2694306306',
  email: 'contact@morashawiri.com',
  website: 'https://services.morashawiri.com',
} as const;

export interface SocialLink {
  label: string;
  href: string;
  /** Chemin SVG de la marque, tracé dans une viewBox 24×24. */
  path: string;
}

export const SOCIAL_LINKS: readonly SocialLink[] = [
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/morashawiri',
    path: 'M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06C2 17.08 5.66 21.24 10.44 22v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.91h-2.33V22C18.34 21.24 22 17.08 22 12.06Z',
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@morashawiri',
    path: 'M21.58 7.19a2.5 2.5 0 0 0-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42A2.5 2.5 0 0 0 2.42 7.19 26 26 0 0 0 2 12a26 26 0 0 0 .42 4.81 2.5 2.5 0 0 0 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42a2.5 2.5 0 0 0 1.77-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.42-4.81ZM10 15.02V8.98L15.2 12 10 15.02Z',
  },
  {
    label: 'WhatsApp',
    href: 'https://wa.me/2694306306',
    path: 'M17.47 14.38c-.29-.15-1.7-.84-1.96-.93-.26-.1-.45-.15-.64.14-.19.29-.74.93-.9 1.12-.17.19-.33.21-.62.07-.29-.15-1.22-.45-2.32-1.43-.86-.76-1.44-1.71-1.6-2-.17-.29-.02-.44.13-.59.13-.13.29-.34.43-.51.15-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.07-.14-.64-1.55-.88-2.12-.23-.56-.47-.48-.64-.49h-.55c-.19 0-.5.07-.76.36-.26.29-1 .98-1 2.38s1.02 2.76 1.17 2.95c.14.19 2.01 3.08 4.88 4.32.68.29 1.21.47 1.63.6.68.22 1.31.19 1.8.11.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.34ZM12.05 21.5h-.01a9.4 9.4 0 0 1-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.38 9.38 0 0 1-1.44-5.01c0-5.18 4.22-9.4 9.41-9.4 2.51 0 4.87.98 6.65 2.76a9.35 9.35 0 0 1 2.75 6.65c0 5.19-4.22 9.41-9.4 9.41Z',
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/morashawiri',
    path: 'M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.66H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.55V9h3.57v11.45Z',
  },
  {
    label: 'Telegram',
    href: 'https://t.me/morashawiri',
    path: 'M21.94 4.6 18.9 19.3c-.23 1.02-.84 1.27-1.7.79l-4.7-3.46-2.27 2.18c-.25.25-.46.46-.94.46l.34-4.78 8.7-7.86c.38-.34-.08-.53-.59-.19l-10.75 6.77-4.63-1.45c-1.01-.31-1.03-1 .21-1.48l18.1-6.98c.84-.31 1.57.19 1.3 1.48Z',
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/shawiridigital/',
    path: 'M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.8 3.8 0 0 1-1.38-.9 3.8 3.8 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07Zm0 5.68a4.16 4.16 0 1 0 0 8.32 4.16 4.16 0 0 0 0-8.32Zm0 6.86a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4Zm5.3-7.02a.97.97 0 1 1-1.95 0 .97.97 0 0 1 1.95 0Z',
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@morashawiri',
    path: 'M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 0 1 0-5.18c.27 0 .52.04.76.12v-3.13a5.71 5.71 0 0 0-.76-.05A5.71 5.71 0 0 0 9.86 21a5.71 5.71 0 0 0 5.71-5.71V9.01a7.35 7.35 0 0 0 4.29 1.38V7.3a4.29 4.29 0 0 1-3.26-1.48Z',
  },
];

/** Documents légaux affichés en fenêtre modale depuis le pied de page. */
export type LegalDocumentKey = 'privacy' | 'terms' | 'legal';

export interface LegalDocument {
  title: string;
  updatedAt: string;
  sections: { heading: string; body: string }[];
}

export const LEGAL_DOCUMENTS: Record<LegalDocumentKey, LegalDocument> = {
  privacy: {
    title: 'Politique de confidentialité',
    updatedAt: 'Août 2026',
    sections: [
      {
        heading: '1. Responsable du traitement',
        body: "MORACare Enterprise est édité par MORA Shawiri. Pour toute question relative à vos données, écrivez à contact@morashawiri.com.",
      },
      {
        heading: '2. Données collectées',
        body: "Sur ce site : les informations que vous saisissez volontairement dans les formulaires de démonstration et de contact — nom, adresse e-mail, téléphone, établissement et message. Aucun profilage publicitaire n'est réalisé.",
      },
      {
        heading: '3. Données de santé',
        body: "Les données médicales traitées dans la plateforme appartiennent à l'établissement de santé qui les saisit. MORA Shawiri agit en qualité de sous-traitant technique et n'en fait aucun usage propre.",
      },
      {
        heading: '4. Finalité',
        body: "Vos informations servent exclusivement à répondre à votre demande et à organiser une démonstration. Elles ne sont ni vendues, ni cédées, ni transmises à des tiers à des fins commerciales.",
      },
      {
        heading: '5. Isolation et sécurité',
        body: "Chaque établissement dispose d'un environnement totalement isolé au niveau de la base de données. Les accès sont contrôlés par rôle, chiffrés en transit, et toutes les opérations sensibles sont journalisées dans un registre inaltérable.",
      },
      {
        heading: '6. Conservation',
        body: "Les demandes de contact sont conservées le temps nécessaire à leur traitement, puis archivées. La durée de conservation des données médicales relève de la formule souscrite par l'établissement et de la réglementation applicable.",
      },
      {
        heading: '7. Vos droits',
        body: "Vous disposez d'un droit d'accès, de rectification, d'effacement et d'opposition sur vos données. Adressez votre demande à contact@morashawiri.com : elle sera traitée dans les meilleurs délais.",
      },
    ],
  },
  terms: {
    title: "Conditions générales d'utilisation",
    updatedAt: 'Août 2026',
    sections: [
      {
        heading: '1. Objet',
        body: "Les présentes conditions régissent l'accès à MORACare Enterprise, Système d'Information Hospitalier édité par MORA Shawiri, ainsi qu'à son site de présentation.",
      },
      {
        heading: '2. Accès au service',
        body: "L'accès est réservé aux établissements de santé disposant d'un abonnement actif. Les comptes utilisateurs sont créés par le responsable de l'établissement, qui en assure la gestion et la révocation.",
      },
      {
        heading: '3. Formules et facturation',
        body: "Les formules disponibles sont Essai, Gratuit, Standard, Business et VIP. Chacune définit un nombre d'utilisateurs et un volume d'enregistrements. La facturation est mensuelle pour les formules payantes.",
      },
      {
        heading: '4. Engagements de l’éditeur',
        body: "MORA Shawiri met en œuvre les moyens nécessaires à la disponibilité du service, à la sauvegarde des données et à l'isolation stricte des environnements de chaque établissement.",
      },
      {
        heading: '5. Obligations de l’utilisateur',
        body: "L'utilisateur s'engage à préserver la confidentialité de ses identifiants, à n'accéder qu'aux données relevant de ses fonctions, et à signaler sans délai tout accès anormal. Toute action réalisée sous un compte engage son titulaire.",
      },
      {
        heading: '6. Suspension',
        body: "En cas de non-renouvellement ou de manquement, l'accès peut être suspendu. La suspension n'entraîne jamais la suppression des données de l'établissement, qui restent restaurables après régularisation.",
      },
      {
        heading: '7. Propriété',
        body: "Les données saisies demeurent la propriété exclusive de l'établissement. La plateforme, son code et sa documentation demeurent la propriété de MORA Shawiri.",
      },
    ],
  },
  legal: {
    title: 'Mentions légales',
    updatedAt: 'Août 2026',
    sections: [
      {
        heading: 'Éditeur',
        body: "MORA Shawiri — éditeur de MORACare Enterprise, Système d'Information Hospitalier.",
      },
      {
        heading: 'Contact',
        body: `Téléphone et WhatsApp : ${CONTACT_INFO.phone}\nE-mail : ${CONTACT_INFO.email}\nSite : ${CONTACT_INFO.website}`,
      },
      {
        heading: 'Hébergement',
        body: "L'application est hébergée sur une infrastructure cloud, et les données sur une base PostgreSQL administrée par Supabase.",
      },
      {
        heading: 'Propriété intellectuelle',
        body: "L'ensemble des contenus de ce site — textes, visuels, marques et logiciel — est protégé. Toute reproduction sans autorisation écrite préalable est interdite.",
      },
    ],
  },
};
