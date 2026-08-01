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
  source: string;
}

const GUARANTEES: readonly Guarantee[] = [
  {
    label: 'Isolation des établissements',
    detail:
      "Chaque table métier porte une politique RLS filtrant sur establishment_id. Le filtrage est appliqué par PostgreSQL, jamais par l'interface.",
    source: 'TD02 §14, TD06 §8',
  },
  {
    label: 'Authentification côté serveur',
    detail:
      "La session est revalidée à chaque requête par le middleware, et les routes privées redirigent avant tout rendu.",
    source: 'TD06 §7, BP06 §14',
  },
  {
    label: "Journal d'audit inaltérable",
    detail:
      "La table audit_logs ne dispose d'aucune politique UPDATE ni DELETE : aucune modification n'est possible, y compris par le Super Admin.",
    source: 'BP26B',
  },
  {
    label: 'Références métier non modifiables',
    detail:
      "Un trigger refuse toute modification d'une référence métier après création, et les séquences garantissent leur unicité.",
    source: 'TD02 §8',
  },
  {
    label: 'Séparation du Super Administrateur',
    detail:
      "Le Super Admin n'a aucune permission sur les modules de soins, et le middleware lui interdit les URL cliniques.",
    source: 'BP06 §10 bis, UG01 §1',
  },
  {
    label: 'Suppression logique',
    detail:
      "Les données critiques ne sont jamais supprimées physiquement : la colonne deleted_at conserve l'enregistrement.",
    source: 'TD02 §10, §12',
  },
];

export const SecurityPanel: React.FC = () => (
  <div className="space-y-4">
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
      <h3 className="text-base font-bold text-white flex items-center gap-2">
        <Lock className="w-4 h-4 text-mora-green" /> Garanties de sécurité effectives
      </h3>
      <p className="text-xs text-slate-400 mt-1">
        Chaque garantie ci-dessous correspond à un mécanisme réellement présent dans le code ou la
        base, avec sa référence documentaire.
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
              <span className="inline-block mt-2 px-1.5 py-0.5 rounded bg-slate-800 text-[9px] font-mono text-slate-400">
                {item.source}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>

    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
      <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
      <div className="text-xs text-amber-200/90 space-y-1">
        <p className="font-bold text-amber-300">Exigences TD06 non encore implémentées</p>
        <p>
          L&apos;authentification à deux facteurs, la durée d&apos;expiration de session
          configurable, le chiffrement applicatif des données sensibles et la politique de rétention
          ne sont pas en place. Elles ne sont donc pas présentées comme actives.
        </p>
      </div>
    </div>
  </div>
);
