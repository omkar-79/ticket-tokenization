"use client";

import { motion } from "framer-motion";
import { useMotionSafe } from "../../lib/motion.js";

const variants = {
  primary:
    "bg-accent text-bg hover:bg-accent-dim border-transparent",
  secondary:
    "bg-transparent text-text border-border hover:border-white/20",
  danger:
    "bg-transparent text-error border-error/30 hover:border-error/50",
  ghost:
    "bg-transparent text-muted border-transparent hover:text-text",
};

export default function Button({
  children,
  variant = "primary",
  loading = false,
  loadingLabel = "…",
  disabled = false,
  className = "",
  ...props
}) {
  const { whileTap, transition } = useMotionSafe();

  return (
    <motion.button
      type="button"
      whileTap={whileTap}
      transition={transition}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center min-h-11 px-5 py-2.5 text-sm font-medium tracking-wide rounded-[var(--radius-button)] border transition-colors disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? loadingLabel : children}
    </motion.button>
  );
}
