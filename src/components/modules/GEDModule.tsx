'use client';

import React from 'react';
import { FolderArchive, ShieldCheck } from 'lucide-react';
export const GEDModule: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <FolderArchive className="w-5 h-5 text-mora-green" /> Gestion Documentaire, GED & Archivage
          </h2>
          <p className="text-xs text-slate-400 mt-1">Archivage automatique des ordonnances, comptes-rendus, factures et documents PDF.</p>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-12 text-center space-y-4">
        <FolderArchive className="w-16 h-16 text-mora-green mx-auto opacity-80" />
        <h3 className="text-xl font-bold text-white">Coffre-Fort Documentaire Chiffré</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          Tous les documents officiels générés au format PDF (ordonnances, factures, certificats) sont automatiquement répertoriés et protégés par chiffrement avec traçabilité d'accès complète.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-mora-green">
          <ShieldCheck className="w-4 h-4" /> Conformité Archivage Légal Certifiée
        </div>
      </div>
    </div>
  );
};
