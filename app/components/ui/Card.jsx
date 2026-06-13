"use client";

import { motion } from "framer-motion";

export default function Card({
  children,
  className = "",
  variant = "default",
  animate = false,
  ...props
}) {
  const borderClass =
    variant === "success"
      ? "border-success/30"
      : variant === "pending"
        ? "border-pending/40"
        : variant === "accent"
          ? "border-accent/30"
          : "border-border";

  const Component = animate ? motion.div : "div";
  const motionProps = animate
    ? { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } }
    : {};

  return (
    <Component
      className={`bg-surface/90 border rounded-[var(--radius-card)] p-[var(--card-p)] ${borderClass} ${className}`}
      {...motionProps}
      {...props}
    >
      {children}
    </Component>
  );
}
