'use client';

import React, { useState } from 'react';
import { KeyRound, UserCog, ArrowRightLeft, UserX, UserCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { listEstablishments } from '@/services/establishment.service';
import type { Establishment, UserAccount, UserRole } from '@/types';

/**
 * Actions d'administration sur un compte (UG01 §9, UG02 §5-6).
 *
 * Couvre la réinitialisation du mot de passe, le changement de rôle, le
 * transfert entre établissements et la suspension/réactivation.
 *
 * Les règles de délégation (BP06 §11) sont appliquées côté serveur : cette
 * interface se contente de masquer ce qui est inutile.
 */

const ROLE_LABELS: Record<Exclude<UserRole, 'super_admin'>, string> = {
  establishment_admin: "Responsable d'établissement",
  doctor: 'Médecin',
  nurse: 'Infirmier(ère)',
  receptionist: 'Réceptionniste',
  pharmacist: 'Pharmacien',
  lab_tech: 'Laboratoire',
  radiologist: 'Imagerie',
  accountant: 'Comptable',
  patient: 'Patient',
};

type Action = 'password' | 'role' | 'transfer' | null;

export const UserActionsMenu: React.FC<{ account: UserAccount }> = ({ account }) => {
  const { user } = useAuth();
  const { updateUserAccount } = useData();

  const [action, setAction] = useState<Action>(null);
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(account.role);
  const [establishmentId, setEstablishmentId] = useState('');
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSuperAdmin = user?.role === 'super_admin';
  const isActive = account.status === 'active';

  const openTransfer = async () => {
    setAction('transfer');
    setError(null);
    try {
      setEstablishments(await listEstablishments());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    }
  };

  const run = async (changes: Parameters<typeof updateUserAccount>[1]) => {
    setBusy(true);
    setError(null);
    try {
      await updateUserAccount(account.id, changes);
      setAction(null);
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opération impossible.');
    } finally {
      setBusy(false);
    }
  };

  const iconButton =
    'p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors disabled:opacity-40';

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          title="Réinitialiser le mot de passe"
          onClick={() => {
            setAction('password');
            setError(null);
          }}
          className={iconButton}
        >
          <KeyRound className="w-3.5 h-3.5" />
        </button>

        <button
          title="Changer le rôle"
          onClick={() => {
            setRole(account.role);
            setAction('role');
            setError(null);
          }}
          className={iconButton}
        >
          <UserCog className="w-3.5 h-3.5" />
        </button>

        {isSuperAdmin && (
          <button title="Transférer d'établissement" onClick={() => void openTransfer()} className={iconButton}>
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          title={isActive ? 'Suspendre' : 'Réactiver'}
          onClick={() => void run({ is_active: !isActive })}
          className={`p-1.5 rounded-lg transition-colors ${
            isActive
              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
          }`}
        >
          {isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
        </button>
      </div>

      <Modal
        isOpen={action !== null}
        onClose={() => setAction(null)}
        title={
          action === 'password'
            ? 'Réinitialiser le mot de passe'
            : action === 'role'
              ? 'Changer le rôle'
              : "Transférer d'établissement"
        }
        description={`${account.first_name} ${account.last_name} — ${account.business_reference}`}
      >
        <div className="space-y-4 text-slate-900 dark:text-slate-100">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
              {error}
            </div>
          )}

          {action === 'password' && (
            <>
              <div>
                <label className="block text-xs font-semibold mb-1">Nouveau mot de passe</label>
                <input
                  type="password"
                  minLength={12}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  12 caractères minimum. À transmettre à l&apos;utilisateur par un canal sûr : il ne
                  sera plus affiché.
                </p>
              </div>
              <Button
                variant="secondary"
                isLoading={busy}
                onClick={() => void run({ password })}
                className="w-full py-2.5 font-bold"
              >
                Réinitialiser
              </Button>
            </>
          )}

          {action === 'role' && (
            <>
              <div>
                <label className="block text-xs font-semibold mb-1">Rôle</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                >
                  {(Object.keys(ROLE_LABELS) as Array<keyof typeof ROLE_LABELS>).map((key) => (
                    <option key={key} value={key}>
                      {ROLE_LABELS[key]}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-400">
                  Les droits du compte changent immédiatement, conformément à la matrice des
                  permissions.
                </p>
              </div>
              <Button
                variant="secondary"
                isLoading={busy}
                onClick={() => void run({ role })}
                className="w-full py-2.5 font-bold"
              >
                Appliquer le rôle
              </Button>
            </>
          )}

          {action === 'transfer' && (
            <>
              <div>
                <label className="block text-xs font-semibold mb-1">Établissement de destination</label>
                <select
                  value={establishmentId}
                  onChange={(e) => setEstablishmentId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                >
                  <option value="">— Sélectionner —</option>
                  {establishments.map((est) => (
                    <option key={est.id} value={est.id}>
                      {est.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-amber-400">
                  Le compte perdra l&apos;accès aux données de son établissement actuel : chaque
                  établissement est totalement isolé.
                </p>
              </div>
              <Button
                variant="secondary"
                isLoading={busy}
                onClick={() => void run({ establishment_id: establishmentId || null })}
                className="w-full py-2.5 font-bold"
              >
                Transférer
              </Button>
            </>
          )}
        </div>
      </Modal>
    </>
  );
};
