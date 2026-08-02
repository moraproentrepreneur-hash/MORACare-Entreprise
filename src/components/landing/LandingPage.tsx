'use client';

import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { useTheme } from 'next-themes';
import {
  Activity,
  ArrowRight,
  ArrowDown,
  Check,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Layers,
  MessageCircle,
  Moon,
  ShieldCheck,
  Sun,
  Menu,
  X
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { PlanCards } from './PlanCards';
import { HeroSection } from './HeroSection';
import {
  ScrollProgress,
  ShimmerButton,
  TiltCard
  } from './motion-primitives';
import {
  ADVANTAGES,
  FAQ_ITEMS,
  FOOTER_LINKS,
  KEY_FIGURES,
  MODULE_CARDS,
  PROBLEM_CONSEQUENCES,
  PROBLEM_TOOLS,
  SECURITY_POINTS,
  SOLUTION_SATELLITES,
  STARTING_STEPS,
  USAGE_PROFILES
} from './landing-content';

/**
 * Landing Page officielle — LP-001.
 *
 * Structure en 12 sections, dans l'ordre et avec les titres littéraux du
 * document. Charte LP-001 §5 : fond blanc, fond alterné #F5F7FA, bleu #003366,
 * vert #00A859, accent #FFD700, police Inter. Le thème clair est le défaut ;
 * une bascule sombre est proposée.
 */

interface LandingPageProps {
  onGoToLogin: () => void;
}

const PROBLEM_ICONS = [FileText, FileSpreadsheet, MessageCircle, Layers, FolderOpen];

const NAV_LINKS = [
  { label: 'Fonctionnalités', href: '#features' },
  { label: 'Solution', href: '#solution' },
  { label: 'Formules', href: '#profiles' },
  { label: 'Sécurité', href: '#security' },
  { label: 'FAQ', href: '#faq' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onGoToLogin }) => {
  const { resolvedTheme, setTheme } = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const [demo, setDemo] = useState({
    full_name: '',
    email: '',
    phone: '',
    establishment_name: '',
    establishment_type: 'clinique',
    message: ''
  });
  const [demoStatus, setDemoStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [demoError, setDemoError] = useState<string | null>(null);

  // Évite l'écart d'hydratation sur l'icône de thème.
  useEffect(() => setMounted(true), []);

  // L'en-tête se densifie une fois la page défilée : repère visuel discret,
  // sans masquer le contenu au premier écran.
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // LP-001 §7 : « Animations discrètes ». Elles sont désactivées si le système
  // de l'utilisateur demande une réduction des animations (accessibilité).
  const fadeUp: Variants = prefersReducedMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 24 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
      };

  const stagger: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: prefersReducedMotion ? 0 : 0.06 } }
  };

  const reveal = {
    initial: 'hidden' as const,
    whileInView: 'visible' as const,
    viewport: { once: true, amount: 0.15 },
    variants: fadeUp
  };

  const openDemo = () => {
    setDemoStatus('idle');
    setDemoError(null);
    setIsDemoOpen(true);
    setIsMenuOpen(false);
  };

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDemoStatus('sending');
    setDemoError(null);

    try {
      const response = await fetch('/api/registration-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(demo)
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Votre demande n'a pas pu être enregistrée.");
      }

      setDemoStatus('sent');
      setDemo({
        full_name: '',
        email: '',
        phone: '',
        establishment_name: '',
        establishment_type: 'clinique',
        message: ''
      });
    } catch (err) {
      setDemoStatus('idle');
      setDemoError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    }
  };

  const ctaPrimary =
    'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-mora-green text-white font-semibold text-sm shadow-lg shadow-mora-green/25 hover:bg-mora-green/90 hover:-translate-y-0.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-mora-green focus-visible:ring-offset-2';
  const ctaSecondary =
    'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-mora-blue/25 dark:border-white/20 text-mora-blue dark:text-white font-semibold text-sm hover:bg-mora-blue/5 dark:hover:bg-white/10 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-mora-blue';

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-mora-green selection:text-white">
      <ScrollProgress />

      {/* ================= NAVBAR — CTA toujours visible (LP-001 §7) ============ */}
      <header
        className={`sticky top-0 z-50 backdrop-blur-lg transition-all duration-300 ${
          isScrolled
            ? 'bg-white/90 dark:bg-slate-950/90 border-b border-slate-200/80 dark:border-slate-800 shadow-sm'
            : 'bg-white/60 dark:bg-slate-950/60 border-b border-transparent'
        }`}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <a href="#top" className="flex items-center gap-2.5 shrink-0">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-mora-blue to-mora-green flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </span>
            <span className="text-lg font-black tracking-tight">
              MORA<span className="text-mora-green">Care</span>
            </span>
          </a>

          <div className="hidden lg:flex items-center gap-7">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="group relative text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-mora-blue dark:hover:text-mora-green transition-colors"
              >
                {link.label}
                {/* Soulignement qui se déploie au survol */}
                <span
                  aria-hidden
                  className="absolute -bottom-1 left-0 h-0.5 w-full origin-left scale-x-0 rounded-full bg-mora-green transition-transform duration-300 group-hover:scale-x-100"
                />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              aria-label="Changer de thème"
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {mounted && resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={onGoToLogin}
              className="hidden sm:inline-flex px-4 py-2 rounded-lg text-sm font-semibold text-mora-blue dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Connexion
            </button>

            <button onClick={openDemo} className="hidden sm:inline-flex px-4 py-2 rounded-lg bg-mora-green text-white text-sm font-semibold hover:bg-mora-green/90 transition-colors">
              Réserver une démonstration
            </button>

            <button
              onClick={() => setIsMenuOpen((v) => !v)}
              aria-label="Menu"
              aria-expanded={isMenuOpen}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>

        {isMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              <button onClick={onGoToLogin} className={ctaSecondary}>
                Connexion
              </button>
              <button onClick={openDemo} className={ctaPrimary}>
                Réserver une démonstration
              </button>
            </div>
          </div>
        )}
      </header>

      <main id="top">
        {/* ============== SECTION 1 — HERO ============== */}
        <HeroSection onRequestDemo={openDemo} />


        {/* ============== SECTION 2 — LES CHIFFRES CLÉS ============== */}
        <section className="bg-mora-light dark:bg-slate-900/60 border-y border-slate-200 dark:border-slate-800">
          <motion.div
            {...reveal}
            variants={stagger}
            className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6"
          >
            {KEY_FIGURES.map((figure) => (
              <motion.div
                key={figure}
                variants={fadeUp}
                whileHover={prefersReducedMotion ? undefined : { y: -4 }}
                className="group text-center cursor-default"
              >
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-mora-green/10 transition-colors group-hover:bg-mora-green/20">
                  <CheckCircle2 className="w-5 h-5 text-mora-green transition-transform group-hover:scale-110" />
                </span>
                <p className="mt-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {figure}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ============== SECTION 3 — LE PROBLÈME ============== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-24">
          <motion.h2 {...reveal} className="text-3xl sm:text-4xl font-black text-center max-w-3xl mx-auto leading-tight">
            Votre établissement mérite mieux que des outils dispersés.
          </motion.h2>

          <motion.div
            {...reveal}
            variants={stagger}
            className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
          >
            {PROBLEM_TOOLS.map((tool, i) => {
              const Icon = PROBLEM_ICONS[i] ?? FileText;
              return (
                <motion.div
                  key={tool}
                  variants={fadeUp}
                  className="p-5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center bg-white dark:bg-slate-900"
                >
                  <Icon className="w-6 h-6 mx-auto text-slate-400" />
                  <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {tool}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div {...reveal} variants={stagger} className="mt-10 flex flex-wrap justify-center gap-3">
            {PROBLEM_CONSEQUENCES.map((item) => (
              <motion.span
                key={item}
                variants={fadeUp}
                className="px-4 py-2 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold border border-red-100 dark:border-red-500/20"
              >
                {item}
              </motion.span>
            ))}
          </motion.div>
        </section>

        {/* ============== SECTION 4 — LA SOLUTION ============== */}
        <section id="solution" className="bg-mora-light dark:bg-slate-900/60 border-y border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-24">
            <motion.h2 {...reveal} className="text-3xl sm:text-4xl font-black text-center">
              Une seule plateforme pour tout gérer.
            </motion.h2>

            <motion.div {...reveal} className="mt-14 flex justify-center">
              <div className="relative w-full max-w-3xl">
                {/* Logo au centre */}
                <div className="flex justify-center">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-mora-blue to-mora-green flex flex-col items-center justify-center shadow-xl shadow-mora-blue/25">
                    <Activity className="w-8 h-8 text-white" />
                    <span className="mt-1 text-[9px] font-black text-white tracking-wider">
                      MORACARE
                    </span>
                  </div>
                </div>

                {/* 14 satellites autour */}
                <motion.div
                  variants={stagger}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  className="mt-10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3"
                >
                  {SOLUTION_SATELLITES.map((item) => (
                    <motion.div
                      key={item}
                      variants={fadeUp}
                      whileHover={prefersReducedMotion ? undefined : { y: -3 }}
                      className="px-3 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center text-[11px] font-semibold text-slate-700 dark:text-slate-200 shadow-sm"
                    >
                      {item}
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ============== SECTION 5 — LES MODULES ============== */}
        <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-24">
          <motion.div {...reveal} className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black">Les modules</h2>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              Chaque métier dispose de son espace, relié aux autres par une base unique.
            </p>
          </motion.div>

          <motion.div
            {...reveal}
            variants={stagger}
            className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {MODULE_CARDS.map((module) => {
              const Icon = module.icon;
              return (
                <motion.div key={module.title} variants={fadeUp}>
                  <TiltCard intensity={7} className="h-full">
                    <article className="group relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-mora-green/50 hover:shadow-xl hover:shadow-mora-green/10 dark:border-slate-800 dark:bg-slate-900">
                      {/* Halo qui suit l'apparition au survol */}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-mora-green/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                      />
                      <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-mora-blue/10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 dark:bg-mora-green/10">
                        <Icon className="h-5 w-5 text-mora-blue dark:text-mora-green" />
                      </span>
                      <h3 className="relative mt-4 text-sm font-bold">{module.title}</h3>
                      <p className="relative mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {module.description}
                      </p>
                    </article>
                  </TiltCard>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* ============== SECTION 6 — POURQUOI MORACARE ? ============== */}
        <section id="why" className="bg-mora-light dark:bg-slate-900/60 border-y border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-24">
            <motion.h2 {...reveal} className="text-3xl sm:text-4xl font-black text-center">
              Pourquoi MORACare Enterprise ?
            </motion.h2>

            <motion.div
              {...reveal}
              variants={stagger}
              className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-3"
            >
              {ADVANTAGES.map((advantage) => (
                <motion.div
                  key={advantage}
                  variants={fadeUp}
                  className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                >
                  <span className="w-6 h-6 shrink-0 rounded-lg bg-mora-green/15 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-mora-green" />
                  </span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {advantage}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ====== SECTION 7 — UNE SOLUTION ADAPTÉE À VOTRE ÉTABLISSEMENT ====== */}
        <section id="profiles" className="max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-24">
          <motion.h2 {...reveal} className="text-3xl sm:text-4xl font-black text-center">
            Une solution adaptée à votre établissement
          </motion.h2>

          <motion.div {...reveal} variants={stagger} className="mt-12 grid md:grid-cols-3 gap-6">
            {USAGE_PROFILES.map((profile) => (
              <motion.div key={profile.title} variants={fadeUp}>
                <TiltCard intensity={5} className="h-full">
                  <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-xl hover:shadow-mora-blue/10 dark:border-slate-800 dark:bg-slate-900">
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-mora-blue to-mora-green transition-transform duration-500 group-hover:scale-x-100"
                    />
                    <h3 className="text-lg font-black text-mora-blue dark:text-mora-green">
                      {profile.title}
                    </h3>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {profile.description}
                    </p>
                    <ShimmerButton onClick={openDemo} className="mt-6 w-full">
                      Demander une démonstration
                    </ShimmerButton>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>

          {/* Formules d'abonnement — BP-009 §4, tarifs officiels MORACare. */}
          <motion.div {...reveal} className="mt-20">
            <h3 className="text-center text-2xl sm:text-3xl font-black">Nos formules</h3>
            <p className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Chaque formule affiche son tarif, ses quotas, ses modules et ses limitations. Aucune
              information n&apos;est masquée.
            </p>

            <div className="mt-10">
              <PlanCards onSelectPlan={openDemo} />
            </div>
          </motion.div>
        </section>

        {/* ============== SECTION 8 — COMMENT DÉMARRER ? ============== */}
        <section id="process" className="bg-mora-light dark:bg-slate-900/60 border-y border-slate-200 dark:border-slate-800">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 lg:py-24">
            <motion.h2 {...reveal} className="text-3xl sm:text-4xl font-black text-center">
              Comment démarrer ?
            </motion.h2>

            <motion.ol {...reveal} variants={stagger} className="mt-12 space-y-2">
              {STARTING_STEPS.map((step, index) => (
                <motion.li key={step} variants={fadeUp}>
                  <div className="flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="w-9 h-9 shrink-0 rounded-xl bg-mora-blue text-white font-black text-sm flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Étape {index + 1}
                      </p>
                      <p className="text-sm font-semibold">{step}</p>
                    </div>
                  </div>
                  {index < STARTING_STEPS.length - 1 && (
                    <div className="flex justify-center py-1.5" aria-hidden>
                      <ArrowDown className="w-4 h-4 text-mora-green" />
                    </div>
                  )}
                </motion.li>
              ))}
            </motion.ol>
          </div>
        </section>

        {/* ============== SECTION 9 — SÉCURITÉ ============== */}
        <section id="security" className="max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-24">
          <motion.div {...reveal} className="text-center max-w-2xl mx-auto">
            <span className="inline-flex w-12 h-12 rounded-2xl bg-mora-blue/10 dark:bg-mora-green/10 items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-mora-blue dark:text-mora-green" />
            </span>
            <h2 className="mt-5 text-3xl sm:text-4xl font-black">Sécurité</h2>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              Les données de santé exigent le plus haut niveau de protection.
            </p>
          </motion.div>

          <motion.div
            {...reveal}
            variants={stagger}
            className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {SECURITY_POINTS.map((point) => (
              <motion.div
                key={point}
                variants={fadeUp}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center"
              >
                <ShieldCheck className="w-5 h-5 mx-auto text-mora-green" />
                <p className="mt-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {point}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ============== SECTION 10 — FAQ ============== */}
        <section id="faq" className="bg-mora-light dark:bg-slate-900/60 border-y border-slate-200 dark:border-slate-800">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 lg:py-24">
            <motion.h2 {...reveal} className="text-3xl sm:text-4xl font-black text-center">
              Questions fréquentes
            </motion.h2>

            <motion.div {...reveal} variants={stagger} className="mt-12 space-y-3">
              {FAQ_ITEMS.map((item, index) => {
                const isOpen = openFaq === index;
                return (
                  <motion.div
                    key={item.question}
                    variants={fadeUp}
                    className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      aria-expanded={isOpen}
                      className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                    >
                      <span className="text-sm font-semibold">{item.question}</span>
                      <ChevronDown
                        className={`w-4 h-4 shrink-0 text-mora-green transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {isOpen && (
                      <motion.p
                        initial={prefersReducedMotion ? undefined : { height: 0, opacity: 0 }}
                        animate={prefersReducedMotion ? undefined : { height: 'auto', opacity: 1 }}
                        className="px-5 pb-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed"
                      >
                        {item.answer}
                      </motion.p>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ============== SECTION 11 — CTA FINAL ============== */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(50%_60%_at_50%_50%,rgba(0,51,102,0.08),transparent_70%)] dark:bg-[radial-gradient(50%_60%_at_50%_50%,rgba(0,168,89,0.14),transparent_70%)]"
          />
          <motion.div {...reveal} className="max-w-3xl mx-auto px-4 sm:px-6 py-24 text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight">
              Prêt à transformer la gestion de votre établissement ?
            </h2>
            <p className="mt-6 text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Réservez une démonstration personnalisée avec notre équipe et découvrez comment
              MORACare Enterprise peut répondre aux besoins de votre structure.
            </p>
            <ShimmerButton onClick={openDemo} className="mt-8 px-8 py-3.5 text-base">
              Réserver une démonstration
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </ShimmerButton>
          </motion.div>
        </section>
      </main>

      {/* ============== SECTION 12 — FOOTER ============== */}
      <footer className="bg-slate-900 dark:bg-slate-950 text-slate-300 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-mora-blue to-mora-green flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </span>
              <span className="text-lg font-black text-white">
                MORA<span className="text-mora-green">Care</span>
              </span>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-slate-400 max-w-xs">
              MORACare Enterprise est un Système d&apos;Information Hospitalier développé par
              <strong className="text-slate-200"> MORA Shawiri</strong>. Il centralise les activités
              médicales, administratives et financières des établissements de santé dans une
              plateforme unique, sécurisée et évolutive.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Liens utiles</h3>
            <ul className="mt-4 space-y-2">
              {FOOTER_LINKS.map((link) => (
                <li key={link}>
                  <span className="text-xs text-slate-400 hover:text-mora-green transition-colors cursor-pointer">
                    {link}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Nous suivre</h3>
            <div className="mt-4 flex gap-2">
              {['in', 'f', 'X'].map((label) => (
                <span
                  key={label}
                  aria-hidden
                  className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-mora-green/20 flex items-center justify-center text-xs font-bold text-slate-300 transition-colors cursor-pointer"
                >
                  {label}
                </span>
              ))}
            </div>
            <button onClick={onGoToLogin} className="mt-6 text-xs font-semibold text-mora-green hover:underline">
              Accès à la plateforme →
            </button>
          </div>
        </div>

        <div className="border-t border-slate-800 py-5 text-center text-[11px] text-slate-500">
          © {new Date().getFullYear()} MORA Shawiri — MORACare Enterprise. Tous droits réservés.
        </div>
      </footer>

      {/* ============== FORMULAIRE DE DÉMONSTRATION ============== */}
      <Modal
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
        title="Réserver une démonstration"
        description="Notre équipe vous recontacte pour planifier une présentation personnalisée."
      >
        {demoStatus === 'sent' ? (
          <div className="py-8 text-center space-y-4">
            <span className="w-16 h-16 rounded-full bg-emerald-500/15 text-mora-green flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </span>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">
              Votre demande est enregistrée
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Un conseiller MORA Shawiri prendra contact avec vous.
            </p>
            <button onClick={() => setIsDemoOpen(false)} className={ctaSecondary}>
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleDemoSubmit} className="space-y-4 text-slate-900 dark:text-slate-100">
            {demoError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-500 dark:text-red-400">
                {demoError}
              </div>
            )}

            <div>
              <label htmlFor="demo-name" className="block text-xs font-semibold mb-1">
                Nom complet *
              </label>
              <input
                id="demo-name"
                type="text"
                required
                value={demo.full_name}
                onChange={(e) => setDemo({ ...demo, full_name: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="demo-email" className="block text-xs font-semibold mb-1">
                  Email professionnel *
                </label>
                <input
                  id="demo-email"
                  type="email"
                  required
                  value={demo.email}
                  onChange={(e) => setDemo({ ...demo, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
                />
              </div>
              <div>
                <label htmlFor="demo-phone" className="block text-xs font-semibold mb-1">
                  Téléphone
                </label>
                <input
                  id="demo-phone"
                  type="tel"
                  value={demo.phone}
                  onChange={(e) => setDemo({ ...demo, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="demo-est" className="block text-xs font-semibold mb-1">
                  Établissement *
                </label>
                <input
                  id="demo-est"
                  type="text"
                  required
                  value={demo.establishment_name}
                  onChange={(e) => setDemo({ ...demo, establishment_name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
                />
              </div>
              <div>
                <label htmlFor="demo-type" className="block text-xs font-semibold mb-1">
                  Type
                </label>
                <select
                  id="demo-type"
                  value={demo.establishment_type}
                  onChange={(e) => setDemo({ ...demo, establishment_type: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
                >
                  <option value="cabinet">Cabinet médical</option>
                  <option value="clinique">Clinique</option>
                  <option value="centre_medical">Centre médical</option>
                  <option value="hopital">Hôpital</option>
                  <option value="laboratoire">Laboratoire</option>
                  <option value="imagerie">Centre d&apos;imagerie</option>
                  <option value="ong">ONG médicale</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="demo-message" className="block text-xs font-semibold mb-1">
                Votre besoin
              </label>
              <textarea
                id="demo-message"
                rows={3}
                value={demo.message}
                onChange={(e) => setDemo({ ...demo, message: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={demoStatus === 'sending'}
              className={`${ctaPrimary} w-full disabled:opacity-60`}
            >
              {demoStatus === 'sending' ? 'Envoi en cours…' : 'Envoyer ma demande'}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
};
