'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useBranding } from '@/context/BrandingContext';
import { Button } from '@/components/ui/Button';
import { recordAudit } from '@/services/audit.service';
import {
  getEstablishmentProfile,
  saveEstablishmentProfile,
  type EstablishmentProfile,
} from '@/services/establishment.service';
import {
  HospitalizationSettingsPanel,
  PharmacySettingsPanel,
} from './ModuleConfigPanels';

/**
 * Onglet de réglage d'un module.
 *
 * Les réglages sont portés par le profil de l'établissement : ils suivent donc
 * le même chemin d'enregistrement, les mêmes politiques RLS et le même journal
 * d'audit que le reste de son identité. Leur donner une table séparée aurait
 * dupliqué tout cela sans rien apporter.
 */
export const ModuleSettingsTab: React.FC<{
  module: 'hospitalization' | 'pharmacy';
  editable: boolean;
}> = ({ module, editable }) => {
  const { user } = useAuth();
  const { refresh: refreshBranding } = useBranding();

  const [profile, setProfile] = useState<EstablishmentProfile | null>(null);
  const [draft, setDraft] = useState<EstablishmentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.establishment_id) {
      setIsLoading(false);
      return;
    }

    try {
      const found = await getEstablishmentProfile(user.establishment_id);
      setProfile(found);
      setDraft(found);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = JSON.stringify(profile?.moduleSettings) !== JSON.stringify(draft?.moduleSettings);

  const handleSave = async () => {
    if (!draft || !user?.establishment_id) return;

    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      await saveEstablishmentProfile(user.establishment_id, draft);
      await recordAudit(
        {
          action: 'module_settings_updated',
          entityName: 'establishments',
          entityId: user.establishment_id,
          newValues: { module },
        },
        user.establishment_id,
        user.id,
      );
      await load();
      await refreshBranding();
      setNotice('Les réglages sont enregistrés et appliqués au module.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl border border-slate-800 bg-slate-900" />;
  }

  if (!draft) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300">
        Aucun établissement n&apos;est rattaché à votre compte.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-400">
          {notice}
        </div>
      )}

      {module === 'hospitalization' ? (
        <HospitalizationSettingsPanel
          settings={draft.moduleSettings.hospitalization}
          editable={editable}
          currency={draft.currency}
          onChange={(hospitalization) =>
            setDraft({
              ...draft,
              moduleSettings: { ...draft.moduleSettings, hospitalization },
            })
          }
        />
      ) : (
        <PharmacySettingsPanel
          settings={draft.moduleSettings.pharmacy}
          editable={editable}
          onChange={(pharmacy) =>
            setDraft({ ...draft, moduleSettings: { ...draft.moduleSettings, pharmacy } })
          }
        />
      )}

      {editable && dirty && (
        <div className="sticky bottom-0 z-10 flex flex-col gap-2 rounded-2xl border border-mora-green/40 bg-slate-900/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-300">Des modifications ne sont pas encore enregistrées.</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setDraft(profile)}
              className="flex-1 sm:flex-none"
            >
              Annuler
            </Button>
            <Button
              variant="secondary"
              isLoading={isSaving}
              onClick={() => void handleSave()}
              className="flex-1 font-bold sm:flex-none sm:px-8"
            >
              Enregistrer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
