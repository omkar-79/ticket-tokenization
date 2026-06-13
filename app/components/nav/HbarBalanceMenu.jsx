"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Button from "../ui/Button.jsx";
import { useHbarBalance } from "../../hooks/useHbarBalance.js";
import { useAccount } from "../../hooks/useAccount.js";
import { formatAccountDisplay } from "../../lib/accountDisplay.js";
import { useToast } from "../ui/ToastHost.jsx";

const PRESETS = [30, 60, 100];

function formatBalance(value) {
  if (value == null) return "—";
  return `${value.toFixed(2)} ℏ`;
}

export default function HbarBalanceMenu({ compact = false, pill = false }) {
  const { balanceHbar, loading, reloadLoading, error, reload, enabled, accountId } = useHbarBalance();
  const { ensName } = useAccount();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("60");
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    if (pill || compact) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, pill, compact]);

  if (!enabled) return null;

  async function handleReload(preset) {
    const value = preset ?? Number(amount);
    try {
      const data = await reload(value);
      toast(`Added ${data.amountHbar} ℏ — balance ${formatBalance(data.balanceHbar)}`, "success");
      if (preset) setAmount(String(preset));
    } catch {
      /* error surfaced in panel */
    }
  }

  const displayName = formatAccountDisplay(accountId, ensName);
  const useSheet = pill || compact;

  const panelInner = (
    <div className="p-4 space-y-0 min-w-0">
      <div className="flex items-start justify-between gap-3 pb-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-widest text-muted">Available HBAR</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-text tracking-tight">
            {loading && balanceHbar == null ? "…" : formatBalance(balanceHbar)}
          </p>
          {displayName && (
            <p
              className="mt-1.5 font-mono text-[11px] text-muted truncate"
              title={displayName}
            >
              {displayName}
            </p>
          )}
        </div>
        {useSheet && (
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="shrink-0 w-8 h-8 rounded-lg border border-border/80 text-muted hover:text-text transition-colors touch-manipulation"
          >
            ✕
          </button>
        )}
      </div>

      <Section label="Quick reload">
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={reloadLoading}
              onClick={() => handleReload(preset)}
              className="rounded-xl border border-border bg-bg/40 px-2 py-2.5 text-xs font-mono text-text hover:border-accent/40 hover:bg-accent/5 disabled:opacity-40 touch-manipulation transition-colors"
            >
              +{preset} ℏ
            </button>
          ))}
        </div>
      </Section>

      <Section label="Custom amount">
        <div className="space-y-2">
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full min-w-0 rounded-xl border border-border bg-bg px-3 py-2.5 text-sm font-mono text-text min-h-11"
          />
          <Button
            variant="primary"
            loading={reloadLoading}
            disabled={reloadLoading}
            className="w-full"
            onClick={() => handleReload()}
          >
            Reload
          </Button>
        </div>
      </Section>

      {error && (
        <p className="pt-3 text-xs text-error leading-relaxed border-t border-border/60 mt-4">{error}</p>
      )}

      <p className="pt-3 text-[10px] leading-relaxed text-muted border-t border-border/60 mt-4">
        Testnet top-up from the operator treasury.
      </p>
    </div>
  );

  return (
    <div ref={rootRef} className={`relative ${compact && !pill ? "w-full" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={
          pill
            ? "inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-surface/80 px-3 py-1.5 text-xs touch-manipulation"
            : `inline-flex items-center gap-2 rounded-xl border border-border bg-bg/80 px-3 py-2 text-xs transition-colors hover:border-accent/40 hover:text-accent touch-manipulation ${
                compact ? "w-full justify-between" : ""
              }`
        }
      >
        {!pill && <span className="text-muted tracking-wide">Balance</span>}
        <span className="font-mono tabular-nums text-text text-[11px] sm:text-xs">
          {loading && balanceHbar == null ? "…" : formatBalance(balanceHbar)}
        </span>
        {!pill && (
          <span className="text-muted text-[10px]" aria-hidden>
            {open ? "▴" : "▾"}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {useSheet && (
              <motion.button
                type="button"
                aria-label="Close balance panel"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-sm"
                onClick={() => setOpen(false)}
              />
            )}
            <motion.div
              role="dialog"
              aria-label="HBAR wallet"
              initial={useSheet ? { opacity: 0, y: 24 } : { opacity: 0, y: -6, scale: 0.98 }}
              animate={useSheet ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, scale: 1 }}
              exit={useSheet ? { opacity: 0, y: 24 } : { opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className={
                useSheet
                  ? "fixed z-[70] inset-x-3 bottom-[calc(var(--tab-bar-height)+env(safe-area-inset-bottom)+0.5rem)] md:inset-x-auto md:bottom-auto md:right-0 md:mt-2 w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-border/80 glass-panel shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto"
                  : "absolute z-50 mt-2 right-0 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-border/80 glass-panel shadow-2xl overflow-hidden"
              }
            >
              {panelInner}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <section className="pt-4 border-t border-border/60 space-y-2.5">
      <p className="text-[10px] uppercase tracking-widest text-muted">{label}</p>
      {children}
    </section>
  );
}
