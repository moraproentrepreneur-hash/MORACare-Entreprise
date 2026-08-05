'use client';

import React, { useState } from 'react';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ASSIGNABLE_ROLES, ROLE_LABELS } from '@/lib/roles';
import { createPlatformUser, type IssuedCredentials } from '@/services/platform-admin.service';
import type { Establishment, UserRole } from '@/types';

/**
 * Création d'un compte d'administration depuis la console MORA Shawiri.
 *
 * Le même formulaire sert dans « Gestion des Admins » et juste après la
 * création d'un établissement : un établissement sans administrateur est
 * inexploitable, et le second point d'entrée existe pour qu'il n'en reste
 * jamais un seul dans cet état.
 *
 * Quand l'établissement est imposé (cas de la création), il n'est pas
 * modifiable : il est affiché, pas resélectionnable.
 *
 * Aucun mot de passe n'est saisi ici. Le serveur en produit un, conforme à la
 * politique et imprévisible, qu'il renvoie une seule fois pour être copié ou
 * envoyé. Laisser un administrateur pressé en choisir un aboutissait à des
 * secrets faibles, et connus de lui.
 */

export interface AdminAccountFormProps {
  establishments: readonly Establishment[];
  /** Établissement imposé — le sélecteur est alors remplacé par un rappel. */
  lockedEstablishment?: Establishment;
  /** Rôle proposé par défaut. */
  defaultRole?: UserRole;
  /** Reçoit les identifiants générés, à présenter à l'administrateur. */
  onCreated: (credentials: IssuedCredentials & { fullName: string; establishmentName: string }) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

const FIELD =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:ring-1 focus:ring-mora-blue';

/** Identifiant proposé à partir du nom, tant que l'utilisateur n'en saisit pas. */
const suggestUsername = (firstName: string, lastName: string): string =>
  `${firstName}.${lastName}`
    .toLowerCase()
    // NFD sépare la lettre de son accent ; le filtre qui suit élimine l'accent
    // au même titre que tout autre caractère non alphanumérique.
    .normalize('NFD')
    .replace(/[^a-z0-9.]/g, '')
    .replace(/^\.+|\.+$/g, '');

export const AdminAccountForm: React.FC<AdminAccountFormProps> = ({
  establishments,
  lockedEstablishment,
  defaultRole = 'establishment_admin',
  onCreated,
  onCancel,
  submitLabel = 'Créer le compte',
}) => {
  const [form, setForm] = useState({
    establishment_id: lockedEstablishment?.id ?? '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    username: '',
    role: defaultRole as UserRole,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const username = form.username || suggestUsername(form.first_name, form.last_name);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.establishment_id) {
      setError("Sélectionnez l'établissement auquel rattacher ce compte.");
      return;
    }

    setIsSaving(true);
    try {
      // Aucun mot de passe transmis : le serveur le génère.
      const credentials = await createPlatformUser({
        establishment_id: form.establishment_id,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone || undefined,
        username: username || undefined,
        role: form.role,
      });

      const establishmentName =
        lockedEstablishment?.name ??
        establishments.find((est) => est.id === form.establishment_id)?.name ??
        'MORACare';

      await onCreated({
        ...credentials,
        fullName: `${form.first_name} ${form.last_name}`.trim(),
        establishmentName,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="adm-est" className="mb-1 block text-xs font-semibold text-slate-300">
          Établissement *
        </label>
        {lockedEstablishment ? (
          <p
            id="adm-est"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-white"
          >
            {lockedEstablishment.name}
          </p>
        ) : (
          <Select
            id="adm-est"
            required
            value={form.establishment_id}
            onChange={(value) => setForm({ ...form, establishment_id: value })}
            placeholder="— Sélectionner —"
            options={establishments.map((est) => (
              ({ value: est.id, label: est.name })
            ))}
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="adm-first" className="mb-1 block text-xs font-semibold text-slate-300">
            Prénom *
          </label>
          <input
            id="adm-first"
            type="text"
            required
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            className={FIELD}
          />
        </div>
        <div>
          <label htmlFor="adm-last" className="mb-1 block text-xs font-semibold text-slate-300">
            Nom *
          </label>
          <input
            id="adm-last"
            type="text"
            required
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            className={FIELD}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="adm-email" className="mb-1 block text-xs font-semibold text-slate-300">
            Email *
          </label>
          <input
            id="adm-email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={FIELD}
          />
        </div>
        <div>
          <label htmlFor="adm-phone" className="mb-1 block text-xs font-semibold text-slate-300">
            Téléphone
          </label>
          <input
            id="adm-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+269 ..."
            className={FIELD}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="adm-username" className="mb-1 block text-xs font-semibold text-slate-300">
            Identifiant
          </label>
          <input
            id="adm-username"
            type="text"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder={username || 'prenom.nom'}
            className={FIELD}
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Sert à se connecter sans connaître l&apos;adresse e-mail. Proposé automatiquement si
            laissé vide.
          </p>
        </div>
        <div>
          <label htmlFor="adm-role" className="mb-1 block text-xs font-semibold text-slate-300">
            Rôle *
          </label>
          <Select
            id="adm-role"
            required
            value={form.role}
            onChange={(value) => setForm({ ...form, role: value as UserRole })}
            options={ASSIGNABLE_ROLES.map((role) => (
              ({ value: role, label: ROLE_LABELS[role] })
            ))}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
        <p className="text-xs font-semibold text-slate-300">Mot de passe</p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
          Généré automatiquement à la création, puis affiché une seule fois pour être copié ou
          envoyé par e-mail. Son titulaire devra le remplacer dès sa première connexion.
          {form.role === 'establishment_admin' &&
            " Un code de vérification à six chiffres lui sera également envoyé : sans lui, le compte reste inactif."}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button
          type="submit"
          variant="secondary"
          isLoading={isSaving}
          className="w-full py-2.5 font-bold sm:w-auto sm:px-8"
        >
          {submitLabel}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="w-full py-2.5 sm:w-auto sm:px-6"
          >
            Annuler
          </Button>
        )}
      </div>
    </form>
  );
};
