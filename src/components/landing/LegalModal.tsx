'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { LEGAL_DOCUMENTS, type LegalDocumentKey } from './legal-content';

/**
 * Affichage des documents légaux en fenêtre modale.
 *
 * LP-001 §6 section 12 liste ces liens dans le pied de page sans en fournir le
 * contenu ni prévoir de pages dédiées : la modale évite de créer des routes
 * non documentées tout en rendant les liens réellement fonctionnels.
 */
export const LegalModal: React.FC<{
  documentKey: LegalDocumentKey | null;
  onClose: () => void;
}> = ({ documentKey, onClose }) => {
  const doc = documentKey ? LEGAL_DOCUMENTS[documentKey] : null;

  return (
    <Modal
      isOpen={doc !== null}
      onClose={onClose}
      title={doc?.title ?? ''}
      description={doc ? `Dernière mise à jour : ${doc.updatedAt}` : ''}
      maxWidth="xl"
    >
      {doc && (
        // Hauteur bornée pour que la fenêtre reste entièrement visible sur
        // mobile : le contenu défile à l'intérieur, jamais la page.
        <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h4 className="text-sm font-bold text-white">{section.heading}</h4>
              <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-slate-400">
                {section.body}
              </p>
            </section>
          ))}
        </div>
      )}
    </Modal>
  );
};
