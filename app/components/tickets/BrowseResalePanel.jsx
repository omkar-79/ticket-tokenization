"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import ListingCard from "./ListingCard.jsx";
import Alert from "../ui/Alert.jsx";
import { CardSkeleton } from "../ui/Skeleton.jsx";
import { useListings } from "../../hooks/useListings.js";
import { useToast } from "../ui/ToastHost.jsx";
import { apiPost } from "../../lib/api.js";
import { walletTabUrl } from "../../lib/routes.js";
import { useMotionSafe } from "../../lib/motion.js";
import { suggestedUnderAskBid, validateBidAmount } from "../../lib/bidding.js";

export default function BrowseResalePanel({ accountId, tokenId, collectionName }) {
  const router = useRouter();
  const { listings, loading, error, refresh } = useListings(tokenId);
  const { toast } = useToast();
  const [bidAmounts, setBidAmounts] = useState({});
  const [bidLoading, setBidLoading] = useState(null);
  const [bidError, setBidError] = useState(null);
  const [buyNowResult, setBuyNowResult] = useState(null);
  const { stagger } = useMotionSafe();

  const openListings = listings.filter((l) => new Date(l.expiresAt) >= new Date());

  async function placeBid(listing, amountOverride) {
    if (!accountId) {
      setBidError("Log in to place a bid");
      return;
    }
    const amount = Number(amountOverride ?? bidAmounts[listing.id] ?? suggestedUnderAskBid(listing) ?? listing.askPriceHbar);
    if (!Number.isFinite(amount) || amount <= 0) {
      setBidError("Enter a valid bid amount");
      return;
    }
    const validationError =
      amount < listing.askPriceHbar ? validateBidAmount(listing, amount) : null;
    if (validationError) {
      setBidError(validationError);
      return;
    }
    setBidLoading(listing.id);
    setBidError(null);
    try {
      const data = await apiPost(
        `/api/listings/${listing.id}/bids`,
        { bidPriceHbar: amount },
        accountId
      );
      if (data.balanceWarning) toast(data.balanceWarning, "pending");
      if (data.autoAccepted) {
        setBuyNowResult({ listingId: listing.id, bidId: data.bid?.id });
        toast("Seller accepted — confirm your purchase in My bids", "success");
        setTimeout(() => router.push(walletTabUrl("bids", data.bid?.id)), 1200);
      } else {
        toast(`Bid of ${amount} HBAR placed — waiting for seller`, "success");
      }
      await refresh();
    } catch (e) {
      setBidError(e.message);
    } finally {
      setBidLoading(null);
    }
  }

  if (loading) {
    return (
      <ul className="space-y-4">
        {[1, 2].map((i) => (
          <li key={i}><CardSkeleton /></li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted leading-relaxed max-w-xl">
        <p>
          Fan-to-fan resale{collectionName ? ` for ${collectionName}` : ""}. Bid below the ask and wait for the seller,
          or match the ask for instant acceptance. After a winning bid, confirm in{" "}
          <strong className="text-text">My Tickets → My bids</strong>.
        </p>
      </div>

      {bidError && <Alert shakeKey={bidError}>{bidError}</Alert>}
      {error && !bidError && <Alert shakeKey={error}>{error}</Alert>}

      {openListings.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg">
          <p className="text-muted text-sm mb-2">
            No tickets listed for resale in this collection yet.
          </p>
          <p className="text-muted text-xs">
            Buy at face value above, or list your own ticket under{" "}
            <strong className="text-text">My Tickets</strong>.
          </p>
        </div>
      ) : (
        <motion.ul
          variants={stagger}
          initial="initial"
          animate="animate"
          className="space-y-4"
        >
          {openListings.map((item) => (
            <ListingCard
              key={item.id}
              item={item}
              accountId={accountId}
              bidAmount={bidAmounts[item.id] ?? suggestedUnderAskBid(item) ?? item.askPriceHbar}
              onBidChange={(v) => setBidAmounts({ ...bidAmounts, [item.id]: v })}
              onBid={(listing, amount) => placeBid(listing, amount)}
              loading={bidLoading}
              buyNowResult={buyNowResult}
            />
          ))}
        </motion.ul>
      )}
    </div>
  );
}
