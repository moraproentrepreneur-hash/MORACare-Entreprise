import {
  Users,
  Calendar,
  Stethoscope,
  BedDouble,
  Pill,
  FlaskConical,
  Binary,
  CreditCard,
  UserCheck,
  FolderArchive,
  Settings,
  Shield,
  UserPlus,
  LayoutDashboard,
  BarChart3,
  HeartPulse,
  type LucideIcon,
} from 'lucide-react';

/**
 * Correspondance entre les codes du référentiel (table `modules`) et leur
 * représentation dans l'interface.
 *
 * Ce fichier ne décide rien : ni quels modules existent (base), ni qui y a
 * accès (base). Il ne porte que ce qui relève strictement du frontend — une
 * route et une icône.
 */

export interface ModuleRoute {
  href: string;
  icon: LucideIcon;
}

export const MODULE_ROUTES: Readonly<Record<string, ModuleRoute>> = {
  // Espace Établissement — chemins conformes à TD04 §9
  dashboard: { href: '/dashboard', icon: LayoutDashboard },
  patients: { href: '/patients', icon: Users },
  appointments: { href: '/appointments', icon: Calendar },
  consultations: { href: '/consultations', icon: Stethoscope },
  hospitalizations: { href: '/hospitalizations', icon: BedDouble },
  pharmacy: { href: '/pharmacy', icon: Pill },
  laboratory: { href: '/laboratory', icon: FlaskConical },
  imaging: { href: '/imaging', icon: Binary },
  finance: { href: '/finance', icon: CreditCard },
  hr: { href: '/hr', icon: UserCheck },
  reports: { href: '/reports', icon: BarChart3 },
  ged: { href: '/ged', icon: FolderArchive },
  user_management: { href: '/users', icon: UserPlus },
  settings: { href: '/settings', icon: Settings },

  // Espace Plateforme (Super Admin) et espace Patient
  saas_platform: { href: '/admin', icon: Shield },
  patient_portal: { href: '/portail', icon: HeartPulse },
};

export const ROUTES = {
  landing: '/',
  login: '/login',
  admin: '/admin',
  dashboard: '/dashboard',
  portal: '/portail',
} as const;

/**
 * Sous-navigation de l'espace Super Admin.
 *
 * Ce sont des écrans du module `saas_platform`, pas des modules distincts :
 * le référentiel ne doit pas être pollué par des entrées de menu.
 */
export const ADMIN_SECTIONS: readonly { label: string; href: string; icon: LucideIcon }[] = [
  { label: 'Supervision SaaS', href: '/admin', icon: Shield },
  { label: 'Établissements Clients', href: '/admin/etablissements', icon: Users },
  { label: 'Abonnements & Licences', href: '/admin/abonnements', icon: CreditCard },
  { label: 'Paramètres Globaux', href: '/admin/parametres', icon: Settings },
];

export const getModuleRoute = (code: string): ModuleRoute | undefined => MODULE_ROUTES[code];
