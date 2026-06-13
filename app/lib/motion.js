"use client";

import { useReducedMotion } from "framer-motion";

export const springSnappy = { type: "spring", stiffness: 400, damping: 30 };

export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const fadeUpTransition = { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] };

export const staggerContainer = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.06 },
  },
};

export const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const shake = {
  x: [0, -4, 4, -4, 4, 0],
  transition: { duration: 0.4 },
};

export function useMotionSafe() {
  const reduced = useReducedMotion();
  return {
    reduced: !!reduced,
    fadeUp: reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
      : fadeUp,
    transition: reduced ? { duration: 0 } : fadeUpTransition,
    whileTap: reduced ? undefined : { scale: 0.98 },
    stagger: reduced ? {} : staggerContainer,
  };
}
