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
                  ? "fixed z-[70] inset-x-3 bottom-[calc(var(--tab-bar-height)+env(safe-area-inset-bottom)+0.5rem)] md:inset-x-auto md:bottom-auto md:right-0 md:mt-2 md:w-80 rounded-2xl border border-border/80 glass-panel shadow-2xl p-5 space-y-4 max-h-[70vh] overflow-y-auto"
                  : "absolute z-50 mt-2 right-0 w-72 rounded-2xl border border-border/80 glass-panel shadow-2xl p-4 space-y-4"
              }
            >
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-muted">Available HBAR</p>
                <p className="text-3xl font-semibold tabular-nums text-text tracking-tight">
                  {loading && balanceHbar == null ? "…" : formatBalance(balanceHbar)}
                </p>
                <p className="font-mono text-[11px] text-accent break-all">{displayName}</p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-muted">Quick reload</p>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={reloadLoading}
                      onClick={() => handleReload(preset)}
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-mono text-text hover:border-accent/50 hover:text-accent disabled:opacity-40 touch-manipulation"
                    >
                      +{preset} ℏ
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                <label className="flex flex-1 flex-col gap-1.5 text-[10px] uppercase tracking-widest text-muted">
                  Custom amount
                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="rounded-xl border border-border bg-bg px-3 py-3 text-base sm:text-sm font-mono text-text normal-case tracking-normal min-h-11"
                  />
                </label>
                <Button
                  variant="primary"
                  loading={reloadLoading}
                  disabled={reloadLoading}
                  className="shrink-0 w-full sm:w-auto"
                  onClick={() => handleReload()}
                >
                  Reload
                </Button>
              </div>

              {error && <p className="text-xs text-error leading-relaxed">{error}</p>}

              <p className="text-[10px] leading-relaxed text-muted">
                Testnet top-up from the operator treasury.
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
