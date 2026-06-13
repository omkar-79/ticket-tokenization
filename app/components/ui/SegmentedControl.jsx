"use client";

import { motion } from "framer-motion";
import Badge from "./Badge.jsx";

export default function SegmentedControl({ items, value, onChange, layoutId = "segment" }) {
  return (
    <div
      className="flex p-1 gap-1 rounded-2xl bg-surface/90 border border-border/80 backdrop-blur-sm"
      role="tablist"
    >
      {items.map((item) => {
        const isActive = value === item.id;
        const badge = item.badge ?? 0;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={`relative flex-1 min-w-0 px-2 sm:px-3 py-2.5 text-xs sm:text-sm font-medium rounded-xl transition-colors touch-manipulation ${
              isActive ? "text-text" : "text-muted"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-xl bg-bg shadow-sm border border-border/50"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-1 whitespace-nowrap">
              <span className="truncate">{item.label}</span>
              {badge > 0 && (
                <Badge variant="pending" className="shrink-0 text-[10px] px-1.5 py-0">
                  {badge}
                </Badge>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
