"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "../ui/Card.jsx";
import Badge from "../ui/Badge.jsx";
import Button from "../ui/Button.jsx";
import Input from "../ui/Input.jsx";
import { fadeUp, fadeUpTransition } from "../../lib/motion.js";
import { walletTabUrl, ticketDetailUrl } from "../../lib/routes.js";
import { suggestedUnderAskBid, isBuyNowAmount } from "../../lib/bidding.js";

export default function ListingCard({
  item,
  accountId,
  bidAmount,
  onBidChange,
  onBid,
  loading,
  buyNowResult,
}) {
  const router = useRouter();
  const isExpired = new Date(item.expiresAt) < new Date();
  const isOwn = accountId === item.sellerAccountId;
  const underAskBid = suggestedUnderAskBid(item);
  const defaultBid = underAskBid ?? item.askPriceHbar;
  const amount = Number(bidAmount !== undefined && bidAmount !== "" ? bidAmount : defaultBid);
  const isBuyNow = isBuyNowAmount(item, amount);

  return (
    <motion.li {...fadeUp} transition={fadeUpTransition}>
      <Card
        className={`space-y-4 ${isExpired ? "opacity-50" : ""}`}
        variant={buyNowResult?.listingId === item.id ? "success" : "default"}
      >
        <div className="flex justify-between items-start gap-4">
          <div>
            <Link
              href={ticketDetailUrl(item.tokenId, item.serial)}
              className="text-lg font-medium hover:text-accent transition-colors"
            >
              {item.tokenName ?? "Ticket"} #{item.serial}
            </Link>
            <p className="font-mono text-xs text-muted mt-1">{item.tokenId}</p>
          </div>
          {isExpired ? (
            <Badge>Expired</Badge>
          ) : (
            <Badge variant="accent">{item.bidCount ?? 0} bid{item.bidCount !== 1 ? "s" : ""}</Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted mb-1">Ask price</p>
            <p className={`text-2xl font-medium tabular-nums ${isExpired ? "line-through text-muted" : "text-accent"}`}>
              {item.askPriceHbar} <span className="text-sm text-muted">HBAR</span>
            </p>
          </div>
          {item.highestBidHbar != null && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted mb-1">Highest bid</p>
              <p className="text-2xl font-medium tabular-nums">{item.highestBidHbar} <span className="text-sm text-muted">HBAR</span></p>
            </div>
          )}
        </div>

        <p className="text-xs text-muted">
          Listed by <span className="font-mono">{item.sellerAccountId}</span>
          {" · "}Expires {new Date(item.expiresAt).toLocaleString()}
          {item.minBidHbar != null && (
            <>
              {" · "}Min bid <span className="text-text">{item.minBidHbar} HBAR</span>
            </>
          )}
        </p>

        {buyNowResult?.listingId === item.id && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-success border-t border-success/20 pt-3"
          >
            Bid accepted.{" "}
            <button
              type="button"
              onClick={() => router.push(walletTabUrl("bids", buyNowResult.bidId))}
              className="text-accent underline"
            >
              Go to My bids to confirm
            </button>
          </motion.div>
        )}

        {!isExpired && !isOwn && accountId && (
          <div className="pt-3 border-t border-border space-y-3">
            <p className="text-xs text-muted">Quick bid</p>
            <div className="flex flex-wrap gap-2">
              {underAskBid != null && (
                <button
                  type="button"
                  onClick={() => onBid(item, underAskBid)}
                  disabled={!!loading}
                  className="px-3 py-1.5 text-xs border border-border rounded-md text-muted hover:text-text hover:border-white/20 transition-colors disabled:opacity-40"
                >
                  Bid {underAskBid} HBAR
                </button>
              )}
              <button
                type="button"
                onClick={() => onBid(item, item.askPriceHbar)}
                disabled={!!loading}
                className="px-3 py-1.5 text-xs border border-accent/40 rounded-md text-accent hover:bg-accent/10 transition-colors disabled:opacity-40"
              >
                Buy at ask · {item.askPriceHbar} HBAR
              </button>
            </div>
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
              <label className="flex-1 min-w-0 w-full sm:min-w-[120px]">
                <span className="text-[10px] uppercase tracking-widest text-muted block mb-1.5">Custom bid</span>
                <Input
                  type="number"
                  min={item.minBidHbar ?? 1}
                  max={item.askPriceHbar}
                  value={bidAmount !== undefined && bidAmount !== "" ? bidAmount : defaultBid}
                  onChange={(e) => onBidChange(e.target.value)}
                />
              </label>
              <Button
                className="w-full sm:w-auto"
                onClick={() => onBid(item)}
                loading={loading === item.id}
                disabled={!!loading}
              >
                {isBuyNow ? "Buy at ask" : "Place bid"}
              </Button>
            </div>
            <p className="text-xs text-muted">
              {isBuyNow ? (
                <>
                  At or above the ask ({item.askPriceHbar} HBAR) — seller accepts instantly. Confirm in{" "}
                  <Link href={walletTabUrl("bids")} className="text-accent">My bids</Link>.
                </>
              ) : (
                <>
                  Bids below {item.askPriceHbar} HBAR wait for the seller to accept.
                  {item.minBidHbar != null && ` Minimum ${item.minBidHbar} HBAR.`}
                </>
              )}
            </p>
          </div>
        )}

        {isOwn && (
          <p className="text-sm text-muted border-t border-border pt-3">
            Your listing —{" "}
            <Link href={walletTabUrl("selling")} className="text-accent">manage in Selling</Link>
          </p>
        )}

        {!accountId && !isExpired && (
          <p className="text-sm text-muted border-t border-border pt-3">
            <Link href="/login" className="text-accent">Log in</Link> to place a bid
          </p>
        )}
      </Card>
    </motion.li>
  );
}
