'use client';

import React from 'react';
import { Lock, ShieldCheck, Info } from 'lucide-react';

/**
 * Sécurité (TD06, BP26B).
 *
 * Cet écran n'énonce que des propriétés réellement garanties par le code et la
 * base. La version précédente affirmait « AES-256 / TLS 1.3 » et « sauvegarde
 * automatique active » sans rien mesurer : ces affirmations décoratives ont été
 * retirées. Annoncer une protection inexistante est pire que ne rien annoncer.
 */

interface Guarantee {
  label: string;
  detail: string;
}

const GUARANTEES: readonly Guarantee[] = [
  {
    label: 'Isolation des établissements',
    detail:
      "Chaque table métier porte une politique de sécurité filtrant sur l'établissement. Le filtrage est appliqué par la base de données, jamais par l'interface.",
  },
  {
    label: 'Authentification côté serveur',
    detail:
      'La session est revalidée à chaque requête par le serveur, et les pages privées redirigent avant tout affichage.',
  },
  {
    label: "Journal d'audit inaltérable",
    detail:
      "Le journal d'audit n'autorise ni modification ni suppression : aucune altération n'est possible, y compris par le Super Admin.",
  },
  {
    label: 'Références métier non modifiables',
    detail:
      "Une référence métier ne peut plus être modifiée après sa création, et son unicité est garantie par la base.",
  },
  {
    label: 'Séparation du Super Administrateur',
    detail:
      "Le Super Admin n'a aucune permission sur les modules de soins, et les pages cliniques lui sont interdites.",
  },
  {
    label: 'Suppression logique',
    detail:
      "Les données critiques ne sont jamais supprimées physiquement : l'enregistrement est conservé et marqué comme supprimé.",
  },
];

export const SecurityPanel: React.FC = () => (
  <div className="space-y-4">
    <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800">
      <h3 className="text-base font-bold text-white flex items-center gap-2">
        <Lock className="w-4 h-4 text-mora-green" /> Garanties de sécurité effectives
      </h3>
      <p className="text-xs text-slate-400 mt-1">
        Chaque garantie ci-dessous correspond à un mécanisme réellement en place dans
        l&apos;application et dans la base de données.
      </p>
    </div>

    <div className="grid md:grid-cols-2 gap-4">
      {GUARANTEES.map((item) => (
        <div key={item.label} className="p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-mora-green shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">{item.label}</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.detail}</p>
            </div>
          </div>
        </div>
      ))}
    </div>

    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
      <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
      <div className="text-xs text-amber-200/90 space-y-1">
        <p className="font-bold text-amber-300">Protections non encore activées</p>
        <p>
          L&apos;authentification à deux facteurs, la durée d&apos;expiration de session
          configurable, le chiffrement applicatif des données sensibles et la politique de rétention
          ne sont pas en place. Elles ne sont donc pas présentées comme actives.
        </p>
      </div>
    </div>
  </div>
);
