'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ShieldCheck, Activity, TrendingUp } from 'lucide-react';
import { AuroraBackground, ShimmerButton, TiltCard } from './motion-primitives';

/**
 * Section 1 de LP-001 — Hero.
 *
 * Titre, sous-titre et CTA sont ceux du document, mot pour mot. Seule la mise
 * en scène est enrichie : halos animés, parallaxe légère au défilement et
 * mockup dont les données se rafraîchissent, pour donner l'impression d'un
 * produit vivant plutôt que d'une capture figée.
 */

interface HeroSectionProps {
  onRequestDemo: () => void;
}

/** Séries affichées tour à tour dans le mockup, pour l'animer sans mentir. */
const MOCKUP_SNAPSHOTS = [
  { labels: ['Patients', 'Consultations', 'Hospitalisations'], bars: [78, 62, 71, 45] },
  { labels: ['Laboratoire', 'Imagerie', 'Pharmacie'], bars: [64, 83, 52, 70] },
  { labels: ['Facturation', 'Encaissements', 'Caisses'], bars: [88, 57, 66, 74] },
];

export const HeroSection: React.FC<HeroSectionProps> = ({ onRequestDemo }) => {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [snapshot, setSnapshot] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  // Parallaxe : le visuel remonte plus lentement que le texte.
  const mockupY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -70]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.85], [1, reduce ? 1 : 0.25]);

  useEffect(() => {
    if (reduce) return;
    const timer = setInterval(() => setSnapshot((s) => (s + 1) % MOCKUP_SNAPSHOTS.length), 3800);
    return () => clearInterval(timer);
  }, [reduce]);

  const current = MOCKUP_SNAPSHOTS[snapshot];

  return (
    <section ref={sectionRef} className="relative overflow-hidden">
      <AuroraBackground className="-z-10" />

      {/*
        Ombre interne sous le bandeau.

        Le Hero commence légèrement plus sombre puis retrouve la teinte de la
        page : le bandeau paraît ainsi posé au-dessus du contenu, et non
        découpé dedans. L'effet s'éteint sur 6 rem, assez pour être perçu, trop
        court pour être remarqué.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-24 bg-gradient-to-b from-slate-950/70 to-transparent dark:from-slate-950/80"
      />

      {/* Grille discrète, pour la profondeur */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035] dark:opacity-[0.07]
                   [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)]
                   [background-size:56px_56px]
                   [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
      />

      <motion.div
        style={{ opacity: contentOpacity }}
        className="mx-auto grid max-w-7xl items-center gap-14 px-4 pb-24 pt-16 sm:px-6 lg:grid-cols-2 lg:pb-28 lg:pt-24"
      >
        {/* Colonne texte */}
        <div>
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-mora-blue/15 bg-mora-blue/5 px-3 py-1.5 text-xs font-bold text-mora-blue dark:border-mora-green/20 dark:bg-mora-green/10 dark:text-mora-green"
          >
            <span className="relative flex h-2 w-2">
              {!reduce && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mora-green opacity-75" />
              )}
              <span className="relative inline-flex h-2 w-2 rounded-full bg-mora-green" />
            </span>
            Système d&apos;Information Hospitalier — MORA Shawiri
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 text-4xl font-black leading-[1.06] tracking-tight sm:text-5xl xl:text-6xl"
          >
            Pilotez votre établissement de santé avec{' '}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-mora-blue via-mora-green to-mora-blue bg-[length:200%_auto] bg-clip-text text-transparent [animation:gradient-pan_6s_linear_infinite] dark:from-mora-green dark:via-emerald-300 dark:to-mora-green">
                une seule plateforme.
              </span>
              <motion.span
                aria-hidden
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="absolute -bottom-1 left-0 h-[3px] w-full origin-left rounded-full bg-gradient-to-r from-mora-green to-transparent"
              />
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg"
          >
            MORACare Enterprise centralise les patients, consultations, hospitalisations, pharmacie,
            laboratoire, imagerie médicale, comptabilité et bien plus encore dans une solution
            moderne, sécurisée et évolutive.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <ShimmerButton onClick={onRequestDemo}>
              Réserver une démonstration
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </ShimmerButton>

            <motion.a
              href="#features"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-mora-blue/25 px-6 py-3 text-sm font-semibold text-mora-blue transition-colors hover:bg-mora-blue/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-mora-blue dark:border-white/20 dark:text-white dark:hover:bg-white/10"
            >
              Découvrir les fonctionnalités
            </motion.a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-slate-500 dark:text-slate-400"
          >
            {[
              { icon: ShieldCheck, text: 'Données isolées par établissement' },
              { icon: Activity, text: 'Temps réel' },
              { icon: TrendingUp, text: 'Architecture évolutive' },
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="inline-flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-mora-green" />
                {text}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Mockup interactif — LP-001 §6 section 1 : « à droite » */}
        <motion.div
          style={{ y: mockupY }}
          initial={reduce ? undefined : { opacity: 0, scale: 0.95, rotateY: -8 }}
          animate={reduce ? undefined : { opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <TiltCard intensity={5}>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-mora-blue/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40">
              <div className="flex h-9 items-center gap-1.5 border-b border-slate-200 bg-slate-100 px-4 dark:border-slate-800 dark:bg-slate-800">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ml-3 text-[10px] font-semibold text-slate-500">
                  MORACare — Tableau de bord
                </span>
                <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-bold text-mora-green">
                  <span className="h-1.5 w-1.5 rounded-full bg-mora-green" />
                  En direct
                </span>
              </div>

              <div className="space-y-4 p-5">
                <div className="grid grid-cols-3 gap-3">
                  {current.labels.map((label, i) => (
                    <motion.div
                      key={`${snapshot}-${label}`}
                      initial={reduce ? undefined : { opacity: 0, y: 8 }}
                      animate={reduce ? undefined : { opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="rounded-xl border border-slate-200/70 bg-mora-light p-3 dark:border-slate-700 dark:bg-slate-800"
                    >
                      <p className="truncate text-[9px] font-semibold uppercase text-slate-500">
                        {label}
                      </p>
                      <div className="mt-2 h-2 w-10 rounded-full bg-mora-blue/70 dark:bg-mora-green/70" />
                    </motion.div>
                  ))}
                </div>

                <div className="space-y-2">
                  {current.bars.map((width, i) => (
                    <div key={i} className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <motion.div
                        key={`${snapshot}-bar-${i}`}
                        initial={reduce ? { width: `${width}%` } : { width: 0 }}
                        animate={{ width: `${width}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full bg-gradient-to-r from-mora-blue to-mora-green"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  {['Dossier patient', 'Ordonnance'].map((label) => (
                    <div
                      key={label}
                      className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"
                    >
                      <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200">
                        {label}
                      </p>
                      <div className="mt-2 flex gap-1">
                        <span className="h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700" />
                        <span className="h-1.5 w-4 rounded-full bg-mora-gold" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TiltCard>

          {/* Vignette flottante, pour la profondeur */}
          {!reduce && (
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -bottom-5 -left-5 hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-800 sm:block"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mora-green/15">
                  <ShieldCheck className="h-4 w-4 text-mora-green" />
                </span>
                <div>
                  <p className="text-[10px] font-bold text-slate-800 dark:text-white">
                    Données isolées
                  </p>
                  <p className="text-[9px] text-slate-500">par établissement</p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </section>
  );
};
