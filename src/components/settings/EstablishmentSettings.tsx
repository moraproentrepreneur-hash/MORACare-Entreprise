'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Save } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/Button';
import { getEstablishment, updateEstablishment } from '@/services/establishment.service';
import { recordAudit } from '@/services/audit.service';
import type { Establishment } from '@/types';

/**
 * Informations générales de l'établissement (BP30 §5, UG02 §16).
 *
 * Toutes les valeurs proviennent de la base : aucune coordonnée n'est
 * pré-remplie, afficher celles d'un autre établissement serait une fuite.
 */
export const EstablishmentSettings: React.FC = () => {
  const { user } = useAuth();
  const { canUpdate } = usePermissions();

  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', city: '', country: '' });
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const editable = canUpdate('settings');

  const load = useCallback(async () => {
    if (!user?.establishment_id) {
      setIsLoading(false);
      return;
    }

    try {
      const found = await getEstablishment(user.establishment_id);
      setEstablishment(found);
      if (found) {
        setForm({
          name: found.name,
          email: found.email,
          phone: found.phone,
          address: found.address ?? '',
          city: found.city ?? '',
          country: found.country ?? '',
        });
      }
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.establishment_id || !establishment) return;

    setStatus('saving');
    setError(null);

    try {
      await updateEstablishment(user.establishment_id, form);
      await recordAudit(
        {
          action: 'establishment_updated',
          entityName: 'establishments',
          entityId: user.establishment_id,
          previousValues: { name: establishment.name, email: establishment.email },
          newValues: { name: form.name, email: form.email },
        },
        user.establishment_id,
        user.id,
      );
      await load();
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
      setStatus('idle');
    }
  };

  if (isLoading) {
    return <div className="h-48 rounded-2xl bg-slate-900 border border-slate-800 animate-pulse" />;
  }

  if (!user?.establishment_id) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
        Votre compte n&apos;est rattaché à aucun établissement. Cet écran concerne la configuration
        d&apos;un établissement client.
      </div>
    );
  }

  const field = (
    label: string,
    key: keyof typeof form,
    type: React.HTMLInputTypeAttribute = 'text',
  ) => (
    <div>
      <label className="block text-xs font-semibold mb-1 text-slate-300">{label}</label>
      <input
        type={type}
        value={form[key]}
        disabled={!editable}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-700 bg-slate-950 text-white outline-none focus:ring-2 focus:ring-mora-blue disabled:opacity-60"
      />
    </div>
  );

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-mora-green" /> Informations générales
          </h3>
          {establishment && (
            <span className="font-mono text-[11px] text-mora-green font-bold">
              {establishment.business_reference}
            </span>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {field("Nom de l'établissement", 'name')}
          {field('Email officiel', 'email', 'email')}
          {field('Téléphone', 'phone', 'tel')}
          {field('Ville', 'city')}
          {field('Pays', 'country')}
          {field('Adresse', 'address')}
        </div>

        {editable && (
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" variant="secondary" isLoading={status === 'saving'} className="gap-2">
              <Save className="w-4 h-4" /> Enregistrer
            </Button>
            {status === 'saved' && (
              <span className="text-xs text-emerald-400">Modifications enregistrées.</span>
            )}
          </div>
        )}
      </div>
    </form>
  );
};
