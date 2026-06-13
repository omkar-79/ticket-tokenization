"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Button from "../ui/Button.jsx";
import Card from "../ui/Card.jsx";
import Badge from "../ui/Badge.jsx";
import { fadeUp, fadeUpTransition } from "../../lib/motion.js";
import { marketplaceCollectionUrl } from "../../lib/routes.js";
import { formatAccountDisplay } from "../../lib/accountDisplay.js";

function formatSerials(tickets) {
  const serials = (tickets ?? []).map((t) => t.serial);
  if (serials.length <= 3) return serials.map((s) => `#${s}`).join(", ");
  return `#${serials[0]}–#${serials[serials.length - 1]}`;
}

export default function CollectionCard({
  item,
  accountId,
  loading,
  purchasingQuantity = 1,
  onBuy,
  buySuccess,
  authPromptId,
  embedded = false,
}) {
  const maxQty = Math.max(1, item.remaining ?? 1);
  const [quantity, setQuantity] = useState(1);
  const pct = item.maxSupply > 0 ? (item.mintedCount / item.maxSupply) * 100 : 0;
  const showAuthPrompt = authPromptId === item.tokenId;
  const isPaused = Boolean(item.paused);
  const isPurchasing = embedded ? loading : loading === item.tokenId;
  const totalHbar = item.faceValueHbar * quantity;
  const collectionLabel = formatAccountDisplay(item.organizerAccountId, item.organizerEnsName);

  useEffect(() => {
    setQuantity((prev) => Math.min(Math.max(1, prev), maxQty));
  }, [maxQty]);

  function handleBuy() {
    if (embedded) {
      onBuy(quantity);
    } else {
      onBuy(item.tokenId, quantity);
    }
  }

  return (
    <motion.li {...fadeUp} transition={fadeUpTransition}>
      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            {embedded ? (
              <h2 className="text-lg font-medium tracking-tight">{item.name}</h2>
            ) : (
              <Link href={marketplaceCollectionUrl(item.tokenId)}>
                <h2 className="text-lg font-medium tracking-tight hover:text-accent transition-colors">
                  {item.name}
                </h2>
              </Link>
            )}
            <p className="text-muted text-xs mt-1 font-mono text-accent break-all">
              {item.symbol} · {collectionLabel}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {item.soldOut ? (
              <Badge variant="default">Sold out</Badge>
            ) : isPaused ? (
              <Badge variant="pending">Paused</Badge>
            ) : (
              <Badge variant="accent">{item.remaining} left</Badge>
            )}
            {(item.resaleListingCount ?? 0) > 0 && !embedded && (
              <Badge variant="pending">
                {item.resaleListingCount} resale{item.resaleListingCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-muted mb-1.5">
            <span>Supply</span>
            <span>{item.mintedCount} / {item.maxSupply}</span>
          </div>
          <div className="h-0.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent/70 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-muted uppercase tracking-widest mb-1">Face value</p>
            <p className="text-2xl sm:text-3xl font-semibold text-accent tracking-tight">
              {item.faceValueHbar} <span className="text-sm font-normal text-muted">HBAR</span>
            </p>
          </div>

          {!item.soldOut && !isPaused && (
            <div className="flex flex-col gap-3 w-full sm:w-auto sm:min-w-[220px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted uppercase tracking-widest">Quantity</span>
                <div className="inline-flex items-center rounded-[var(--radius-button)] border border-border overflow-hidden">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    disabled={isPurchasing || quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="min-h-11 min-w-11 text-lg text-muted hover:text-text hover:bg-white/5 disabled:opacity-40 transition-colors touch-manipulation"
                  >
                    −
                  </button>
                  <span className="min-w-10 text-center text-sm font-semibold tabular-nums text-text px-2">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    disabled={isPurchasing || quantity >= maxQty}
                    onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                    className="min-h-11 min-w-11 text-lg text-muted hover:text-text hover:bg-white/5 disabled:opacity-40 transition-colors touch-manipulation"
                  >
                    +
                  </button>
                </div>
              </div>

              {quantity > 1 && (
                <p className="text-xs text-muted text-right tabular-nums">
                  Total {totalHbar} HBAR
                </p>
              )}

              <Button
                className="w-full shrink-0"
                onClick={handleBuy}
                loading={isPurchasing}
                loadingLabel={
                  purchasingQuantity > 1
                    ? `Purchasing ${purchasingQuantity} tickets…`
                    : "Purchasing ticket…"
                }
                disabled={!!loading && !isPurchasing}
              >
                {quantity > 1 ? `Buy ${quantity} tickets` : "Buy ticket"}
              </Button>
            </div>
          )}
        </div>

        {isPurchasing && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-accent border border-accent/20 bg-accent/5 rounded-xl px-4 py-3"
          >
            {purchasingQuantity > 1
              ? `Minting ${purchasingQuantity} tickets on Hedera — this may take a moment.`
              : "Minting your ticket on Hedera — this may take a moment."}
          </motion.p>
        )}

        {isPaused && (
          <p className="text-xs text-pending border-t border-border pt-3">
            This event is paused — primary sales and resale are temporarily disabled.
          </p>
        )}

        {!embedded && (
          <p className="text-xs text-muted pt-2 border-t border-border">
            <Link href={marketplaceCollectionUrl(item.tokenId)} className="text-accent hover:text-accent-dim">
              View collection
            </Link>
            {(item.resaleListingCount ?? 0) > 0 && (
              <>
                {" · "}
                {item.resaleListingCount} ticket{item.resaleListingCount !== 1 ? "s" : ""} listed for resale
              </>
            )}
          </p>
        )}

        {buySuccess?.tokenId === item.tokenId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="border-t border-success/20 pt-4 text-sm text-success"
          >
            {(buySuccess.quantity ?? 1) > 1 ? (
              <>
                {buySuccess.quantity} tickets minted ({formatSerials(buySuccess.tickets)}).{" "}
              </>
            ) : (
              <>Ticket #{buySuccess.serial} minted. </>
            )}
            <Link href="/wallet" className="underline hover:text-success/80">
              View tickets
            </Link>
            {buySuccess.hashscanUrl && (
              <>
                {" · "}
                <a href={buySuccess.hashscanUrl} target="_blank" rel="noopener noreferrer" className="underline">
                  Transaction
                </a>
              </>
            )}
          </motion.div>
        )}

        {showAuthPrompt && !accountId && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-border pt-4 text-sm text-muted"
          >
            Sign in to purchase.{" "}
            <Link href="/login" className="text-accent">Log in</Link>
            {" or "}
            <Link href="/onboard" className="text-accent">create an account</Link>
          </motion.div>
        )}
      </Card>
    </motion.li>
  );
}
