'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from 'framer-motion';

/**
 * Primitives d'animation de la Landing Page.
 *
 * LP-001 §7 demande des « animations discrètes » et des « transitions douces ».
 * Chaque effet ci-dessous se désactive automatiquement lorsque le système de
 * l'utilisateur demande une réduction des animations : l'accessibilité prime
 * sur l'esthétique.
 */

/** Variantes d'apparition, neutralisées si l'utilisateur réduit les animations. */
export const useRevealVariants = () => {
  const reduce = useReducedMotion();

  const fadeUp: Variants = reduce
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 28 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
        },
      };

  const stagger: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: reduce ? 0 : 0.07, delayChildren: 0.05 } },
  };

  const reveal = {
    initial: 'hidden' as const,
    whileInView: 'visible' as const,
    viewport: { once: true, amount: 0.15 },
    variants: fadeUp,
  };

  return { fadeUp, stagger, reveal, reduce };
};

/** Barre de progression de lecture, fixée en haut de page. */
export const ScrollProgress: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 h-0.5 origin-left z-[60] bg-gradient-to-r from-mora-blue via-mora-green to-mora-gold"
    />
  );
};

/**
 * Compteur qui s'anime à l'entrée dans le champ de vision.
 *
 * Utilisé pour donner du relief aux chiffres sans inventer de données :
 * la valeur finale est toujours celle transmise.
 */
export const CountUp: React.FC<{ to: number; suffix?: string; duration?: number }> = ({
  to,
  suffix = '',
  duration = 1.4,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? to : 0);

  useEffect(() => {
    if (!inView || reduce) return;

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / (duration * 1000), 1);
      // Courbe d'amortissement : rapide au début, précise à l'arrivée.
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * to));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, to, duration, reduce]);

  return (
    <span ref={ref} className="tabular-nums">
      {value}
      {suffix}
    </span>
  );
};

/**
 * Carte réagissant au survol par une légère inclinaison 3D.
 *
 * L'effet suit la position du curseur, ce qui donne une impression de matière
 * sans recourir à une bibliothèque supplémentaire.
 */
export const TiltCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  intensity?: number;
}> = ({ children, className = '', intensity = 6 }) => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [intensity, -intensity]), {
    stiffness: 220,
    damping: 22,
  });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-intensity, intensity]), {
    stiffness: 220,
    damping: 22,
  });

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (reduce || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((event.clientX - rect.left) / rect.width - 0.5);
    y.set((event.clientY - rect.top) / rect.height - 0.5);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', transformPerspective: 900 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/** Halos colorés animés, posés en arrière-plan d'une section. */
export const AuroraBackground: React.FC<{ className?: string }> = ({ className = '' }) => {
  const reduce = useReducedMotion();

  const orb = (base: string, delay: number, position: string) => (
    <motion.div
      aria-hidden
      className={`absolute ${position} h-[28rem] w-[28rem] rounded-full blur-[110px] ${base}`}
      animate={
        reduce
          ? undefined
          : { scale: [1, 1.15, 1], opacity: [0.5, 0.75, 0.5], x: [0, 30, 0], y: [0, -20, 0] }
      }
      transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {orb('bg-mora-green/20 dark:bg-mora-green/25', 0, '-top-32 -left-24')}
      {orb('bg-mora-blue/20 dark:bg-mora-blue/30', 3, 'top-10 right-0')}
      {orb('bg-mora-gold/10 dark:bg-mora-gold/15', 6, 'bottom-0 left-1/3')}
    </div>
  );
};

/** Séparateur dégradé entre deux sections. */
export const SectionDivider: React.FC = () => (
  <div
    aria-hidden
    className="h-px w-full bg-gradient-to-r from-transparent via-slate-300/70 dark:via-slate-700/70 to-transparent"
  />
);

/**
 * Bouton principal avec balayage lumineux au survol.
 *
 * LP-001 §9 : les CTA doivent rester visibles et engageants.
 */
export const ShimmerButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit';
}> = ({ children, onClick, className = '', type = 'button' }) => (
  <motion.button
    type={type}
    onClick={onClick}
    whileHover={{ y: -2 }}
    whileTap={{ scale: 0.98 }}
    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    className={`group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-mora-green px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-mora-green/25 transition-shadow hover:shadow-xl hover:shadow-mora-green/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-mora-green focus-visible:ring-offset-2 ${className}`}
  >
    <span
      aria-hidden
      className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
    />
    <span className="relative inline-flex items-center gap-2">{children}</span>
  </motion.button>
);
