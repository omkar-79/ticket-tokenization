"use client";

import { motion } from "framer-motion";

export default function TicketCheckedInOverlay({
  serial,
  eventName,
  variant = "organizer",
  fullscreen = false,
  onDone,
}) {
  const isHolder = variant === "holder";
  const containerClass = fullscreen
    ? "fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md px-6"
    : "absolute inset-0 z-10 flex items-center justify-center bg-black/75 backdrop-blur-sm px-6";

  return (
    <motion.div
      className={containerClass}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onDone}
    >
      <motion.div
        className="w-full max-w-xs text-center"
        initial={{ scale: 0.85, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
      >
        <motion.div
          className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full border-2 border-success/40 bg-success/10"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 22, delay: 0.05 }}
        >
          <motion.svg
            viewBox="0 0 52 52"
            className="h-12 w-12 text-success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <motion.circle
              cx="26"
              cy="26"
              r="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeOpacity={0.25}
            />
            <motion.path
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14 27l8 8 16-18"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.45, delay: 0.2, ease: "easeOut" }}
            />
          </motion.svg>
        </motion.div>

        <motion.p
          className="text-[10px] uppercase tracking-[0.25em] text-success/80 mb-2"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          {isHolder ? "You're checked in" : "Access granted"}
        </motion.p>

        <motion.h2
          className="text-2xl font-semibold tracking-tight text-text"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Ticket #{serial}
        </motion.h2>

        {eventName && (
          <motion.p
            className="text-sm text-muted mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            {eventName}
          </motion.p>
        )}

        <motion.p
          className="text-xs text-muted/80 mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {isHolder
            ? "Enjoy the event — tap to continue"
            : "Holder frozen · Tap to scan next"}
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
