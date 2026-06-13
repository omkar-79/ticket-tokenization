"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { fadeUp, fadeUpTransition } from "../../lib/motion.js";
import { useMotionSafe } from "../../lib/motion.js";

export default function PageTransition({ children }) {
  const { fadeUp: safeFadeUp, transition } = useMotionSafe();

  return (
    <motion.div {...safeFadeUp} transition={transition}>
      {children}
    </motion.div>
  );
}

export function AuthGate({ title = "Sign in required", children }) {
  return (
    <EmptyState title={title}>
      <p>
        <Link href="/login" className="text-accent hover:text-accent-dim transition-colors">
          Log in
        </Link>
        {" or "}
        <Link href="/onboard" className="text-accent hover:text-accent-dim transition-colors">
          create an account
        </Link>
        {" to continue."}
      </p>
    </EmptyState>
  );
}

function EmptyState({ title, children }) {
  return (
    <div className="py-16 text-center">
      <p className="text-muted text-sm tracking-wide mb-3">{title}</p>
      <div className="text-sm text-muted leading-relaxed">{children}</div>
    </div>
  );
}
