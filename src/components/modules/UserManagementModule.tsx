'use client';

import React, { useState } from 'react';
import { Users, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { UserRole } from '@/types';
import { useData } from '@/context/DataContext';
import { UserActionsMenu } from '@/components/settings/UserActionsMenu';

export const UserManagementModule: React.FC = () => {
  const { userAccounts, addUserAccount } = useData();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    phone: '',
    role: 'doctor' as UserRole,
    department: 'Médecine Générale',
    temp_password: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    try {
      // Le compte est créé côté serveur : la clé service_role nécessaire à
      // Supabase Auth ne peut pas transiter par le navigateur.
      await addUserAccount({
        first_name: form.first_name,
        last_name: form.last_name,
        username: form.username || undefined,
        email: form.email,
        phone: form.phone || undefined,
        department: form.department,
        role: form.role,
        password: form.temp_password,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Création du compte impossible.');
      return;
    }

    setIsAddModalOpen(false);
    setForm({
      first_name: '',
      last_name: '',
      username: '',
      email: '',
      phone: '',
      role: 'doctor',
      department: 'Médecine Générale',
      temp_password: '',
    });
  };

  const filteredUsers = userAccounts.filter((u) =>
    `${u.first_name} ${u.last_name} ${u.username} ${u.business_reference} ${u.role}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-mora-green" /> Gestion des Utilisateurs & Habilitations (IAM)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Création de comptes soignants, attribution des rôles, suspension et politique d&apos;accès.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setIsAddModalOpen(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Créer un Utilisateur
        </Button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher utilisateur par nom, identifiant, rôle..."
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-mora-blue"
        />
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-12 h-12 text-slate-600 mx-auto" />
            <h4 className="text-base font-bold text-slate-300">Aucun utilisateur interne enregistré</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Seul le compte Super Admin initial existe. Cliquez ci-dessous pour ajouter vos premiers médecins et agents.
            </p>
            <Button variant="secondary" onClick={() => setIsAddModalOpen(true)} className="gap-2 mt-2">
              <Plus className="w-4 h-4" /> Créer un utilisateur
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-4">Réf. Agent</th>
                  <th className="p-4">Nom & Prénom</th>
                  <th className="p-4">Identifiant</th>
                  <th className="p-4">Rôle</th>
                  <th className="p-4">Département</th>
                  <th className="p-4">Statut</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-mono text-mora-green font-bold">{u.business_reference}</td>
                    <td className="p-4 font-bold text-white">{u.first_name} {u.last_name}</td>
                    <td className="p-4 font-mono text-slate-300">{u.username}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold uppercase text-[10px]">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4">{u.department}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          u.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="p-4 flex items-center space-x-2">
                      <UserActionsMenu account={u} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE USER MODAL */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Création de Compte Utilisateur Interne">
        <form onSubmit={handleCreate} className="space-y-4 text-slate-900 dark:text-slate-100">
          {submitError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              {submitError}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold mb-1">Prénom *</label>
              <input
                type="text"
                required
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                placeholder="Dr. Jean"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Nom *</label>
              <input
                type="text"
                required
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                placeholder="Dupont"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold mb-1">Identifiant de connexion *</label>
              <input
                type="text"
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="jdupont"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Email Professionnel *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jean.dupont@clinique.com"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold mb-1">Rôle Métier *</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
              >
                <option value="doctor">Médecin</option>
                <option value="nurse">Infirmier / Infirmère</option>
                <option value="pharmacist">Pharmacien</option>
                <option value="lab_tech">Technicien de Laboratoire</option>
                <option value="radiologist">Radiologue / Manipulateur Radio</option>
                <option value="receptionist">Réceptionniste / Accueil</option>
                <option value="accountant">Comptable / Caissier</option>
                <option value="establishment_admin">Responsable d'Établissement</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Département *</label>
              <input
                type="text"
                required
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="Médecine Générale"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Mot de passe temporaire *</label>
            <input
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              value={form.temp_password}
              onChange={(e) => setForm({ ...form, temp_password: e.target.value })}
              placeholder="••••••••••••"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              12 caractères minimum. À transmettre à l&apos;utilisateur par un canal sûr.
            </p>
          </div>

          <div className="pt-2">
            <Button type="submit" variant="secondary" className="w-full py-2.5 font-bold">
              Créer le Compte Utilisateur
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
