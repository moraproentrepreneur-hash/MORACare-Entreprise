'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Lock, Mail, ArrowLeft, ShieldAlert, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface LoginFormProps {
  onBackToLanding: () => void;
}

/**
 * Écran de connexion (BP10, UG01 §3, UG02 §3, UG03 §3).
 *
 * Connexion par e-mail professionnel et mot de passe. Aucun identifiant n'est
 * affiché ni suggéré : CLAUDE.md § Authentification interdit toute divulgation,
 * et le message d'erreur reste volontairement générique pour ne pas permettre
 * d'énumérer les comptes existants.
 */
export const LoginForm: React.FC<LoginFormProps> = ({ onBackToLanding }) => {
  const { login, isConfigured } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await login(email, password);
    if (!result.success) {
      setError(result.error ?? 'Identifiant ou mot de passe incorrect.');
    }
    setLoading(false);
  };

  return (
    <div className="dark min-h-screen bg-slate-950 text-slate-100 flex selection:bg-mora-green selection:text-white">
      {/* Colonne de marque — masquée sur mobile pour laisser place au formulaire */}
      <aside className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 bg-gradient-to-br from-mora-blue via-slate-900 to-slate-950 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(60%_50%_at_30%_20%,rgba(0,168,89,0.20),transparent_70%)]"
        />

        <div className="relative flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-tr from-mora-blue to-mora-green flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </span>
          <span className="text-xl font-black tracking-tight text-white">
            MORA<span className="text-mora-green">Care</span>
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative max-w-md"
        >
          <h2 className="text-3xl font-black leading-tight text-white">
            Le Système d&apos;Information Hospitalier de votre établissement.
          </h2>
          <p className="mt-4 text-sm text-slate-300 leading-relaxed">
            Patients, consultations, hospitalisations, pharmacie, laboratoire, imagerie et
            comptabilité, réunis dans une plateforme unique et sécurisée.
          </p>

          <ul className="mt-8 space-y-3">
            {[
              'Isolation stricte des données de chaque établissement',
              'Accès contrôlé par rôle et par module',
              'Journalisation de toutes les opérations sensibles',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-mora-green shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <p className="relative text-[11px] text-slate-400">
          Édité par MORA Shawiri — Solution médicale internationale
        </p>
      </aside>

      {/* Formulaire */}
      <main className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <button
          onClick={onBackToLanding}
          className="absolute top-6 left-6 lg:static lg:mb-10 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4" /> Retour à l&apos;accueil
        </button>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-md mx-auto"
        >
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-tr from-mora-blue to-mora-green flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </span>
            <span className="text-xl font-black tracking-tight text-white">
              MORA<span className="text-mora-green">Care</span>
            </span>
          </div>

          <h1 className="text-2xl font-black text-white">Connexion</h1>
          <p className="mt-2 text-sm text-slate-400">
            Accédez à l&apos;espace de votre établissement.
          </p>

          {!isConfigured && (
            <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-300">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Connexion à la base de données non configurée</p>
                <p className="text-amber-300/80">
                  Renseignez <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> et{' '}
                  <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> dans{' '}
                  <code className="font-mono">.env.local</code>, puis appliquez les migrations.
                  Voir <code className="font-mono">INSTALLATION.md</code>.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-400 text-xs"
            >
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email professionnel
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="prenom.nom@etablissement.com"
                  className="block w-full pl-10 pr-3 py-3 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-mora-green focus:border-transparent transition-shadow"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-11 py-3 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-mora-green focus:border-transparent transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-mora-green text-white font-bold text-sm shadow-lg shadow-mora-green/25 hover:bg-mora-green/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-mora-green focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              {loading ? 'Connexion en cours…' : 'Se connecter'}
            </button>
          </form>

          <p className="mt-8 text-center text-[11px] text-slate-500 leading-relaxed">
            Vos identifiants vous sont fournis par le responsable de votre établissement.
            <br />
            Toutes les connexions sont journalisées.
          </p>
        </motion.div>
      </main>
    </div>
  );
};
