"use client";

import { motion } from "framer-motion";
import { shake } from "../../lib/motion.js";
import { useMotionSafe } from "../../lib/motion.js";

export default function Alert({ children, variant = "error", shakeKey }) {
  const { reduced } = useMotionSafe();

  const styles =
    variant === "success"
      ? "border-success/30 text-success"
      : variant === "pending"
        ? "border-pending/30 text-pending"
        : variant === "info"
          ? "border-border text-muted"
          : "border-error/30 text-error";

  return (
    <motion.p
      key={shakeKey}
      animate={shakeKey && !reduced ? shake : undefined}
      className={`text-sm leading-relaxed border rounded-md px-3 py-2 ${styles}`}
    >
      {children}
    </motion.p>
  );
}
