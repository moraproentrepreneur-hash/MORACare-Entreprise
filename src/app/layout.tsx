import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { AccessProvider } from '@/context/AccessContext';
import { BrandingProvider } from '@/context/BrandingContext';
import { DataProvider } from '@/context/DataContext';

/**
 * Police Inter, imposée par LP-001 §5 pour les titres et le texte.
 * `next/font` l'auto-héberge : aucun appel réseau externe au chargement.
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'MORACare Enterprise — Pilotez votre établissement de santé',
  description:
    'MORACare Enterprise centralise les patients, consultations, hospitalisations, pharmacie, laboratoire, imagerie médicale, comptabilité et bien plus encore dans une solution moderne, sécurisée et évolutive.',
  keywords: [
    'MORACare',
    'SaaS Médical',
    'Système d’Information Hospitalier',
    'Gestion Hospitalière',
    'Dossier Patient',
    'MORA Shawiri',
  ],
  authors: [{ name: 'MORA Shawiri', url: 'https://www.services.morashawiri.com' }],
  // SEO exigé par LP-001 §8
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'MORACare Enterprise',
    title: 'Pilotez votre établissement de santé avec une seule plateforme.',
    description:
      'Patients, consultations, hospitalisations, pharmacie, laboratoire, imagerie et comptabilité réunis dans une plateforme moderne, sécurisée et évolutive.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MORACare Enterprise',
    description: 'Une seule plateforme pour piloter votre établissement de santé.',
  },
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // MORACare fonctionne exclusivement en mode sombre : la classe `dark` est
    // posée une fois pour toutes sur <html>. Aucune bascule n'est proposée.
    <html lang="fr" className={`dark ${inter.variable} scroll-smooth`}>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased font-sans">
        <AuthProvider>
          {/* Les droits sont chargés avant les données : une interface ne doit
              jamais afficher un module sans savoir s'il est autorisé. */}
          <AccessProvider>
            {/* L'identité visuelle de l'établissement s'applique aux couleurs
                de l'interface et alimente le moteur documentaire. */}
            <BrandingProvider>
              <DataProvider>{children}</DataProvider>
            </BrandingProvider>
          </AccessProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
