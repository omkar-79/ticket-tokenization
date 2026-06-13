"use client";

import { motion } from "framer-motion";
import { fadeUp, fadeUpTransition } from "../../lib/motion.js";
import { useMotionSafe } from "../../lib/motion.js";

export default function PageHeader({ title, description, children }) {
  const { fadeUp: safeFadeUp, transition } = useMotionSafe();

  return (
    <motion.header
      {...safeFadeUp}
      transition={transition}
      className="mb-5 md:mb-[var(--section-y)]"
    >
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-sans font-semibold tracking-tight text-text mb-2 md:mb-3">
        {title}
      </h1>
      {description && (
        <p className="text-muted text-sm md:text-base leading-relaxed max-w-2xl">
          {description}
        </p>
      )}
      {children}
    </motion.header>
  );
}
