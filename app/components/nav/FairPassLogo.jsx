"use client";

import { motion, useReducedMotion } from "framer-motion";

export default function FairPassLogo({ className = "" }) {
  const reduced = useReducedMotion();

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <motion.span
        className="relative flex shrink-0 items-center justify-center"
        initial={reduced ? false : { opacity: 0, y: -2 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className="block"
        >
          {/* Admission stub — perforation + side notches */}
          <path
            d="M6 7h12a2 2 0 0 1 2 2v1.2a1.4 1.4 0 0 0 0 2.6V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1.2a1.4 1.4 0 0 0 0-2.6V9a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeWidth="1.35"
            className="text-text/90"
          />
          <path
            d="M6 7h12a2 2 0 0 1 2 2v1.2a1.4 1.4 0 0 0 0 2.6V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1.2a1.4 1.4 0 0 0 0-2.6V9a2 2 0 0 1 2-2Z"
            fill="currentColor"
            fillOpacity="0.06"
            className="text-accent"
          />
          <line
            x1="15.5"
            y1="8.5"
            x2="15.5"
            y2="17.5"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="1.5 2"
            className="text-accent/70"
          />
          {/* Gate scan — runs once per hover */}
          {!reduced && (
            <rect
              x="7.5"
              y="7.5"
              width="1.25"
              height="11"
              rx="0.6"
              fill="currentColor"
              className="text-accent fairpass-scan opacity-0"
            />
          )}
        </svg>
      </motion.span>

      <span className="text-[15px] font-semibold tracking-[-0.02em] leading-none">
        Fair<span className="text-accent"> Pass</span>
      </span>
    </span>
  );
}
