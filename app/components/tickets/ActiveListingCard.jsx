"use client";

import Link from "next/link";
import Card from "../ui/Card.jsx";
import Badge from "../ui/Badge.jsx";
import Button from "../ui/Button.jsx";
import BidList from "./BidList.jsx";
import { ticketDetailUrl } from "../../lib/routes.js";

function formatExpiry(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function ActiveListingCard({
  listing,
  onCancel,
  onAccept,
  onDecline,
  actionLoading,
}) {
  const canCancel = ["open", "pending_settlement"].includes(listing.status);
  const pendingBids = (listing.bids ?? []).filter((b) => b.status === "pending");

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={ticketDetailUrl(listing.tokenId, listing.serial)}
            className="text-lg font-semibold tracking-tight text-text hover:text-accent transition-colors line-clamp-2"
          >
            {listing.eventName ?? "Event"}
          </Link>
          <p className="text-sm text-muted mt-1">
            Ticket #{listing.serial}
            {listing.eventSymbol ? ` · ${listing.eventSymbol}` : ""}
          </p>
          <p className="font-mono text-[11px] text-muted/80 mt-1 truncate">{listing.tokenId}</p>
        </div>
        <Badge variant={listing.status === "open" ? "accent" : "pending"} className="shrink-0 capitalize">
          {listing.status.replace("_", " ")}
        </Badge>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit max-w-full flex-col rounded-xl border border-accent/25 bg-accent/5 px-3 py-2">
          <p className="text-[10px] uppercase tracking-widest text-accent/80">Ask price</p>
          <p className="text-xl font-semibold tabular-nums text-accent tracking-tight leading-tight">
            {listing.askPriceHbar}
            <span className="text-xs font-normal text-muted ml-1">HBAR</span>
          </p>
          {listing.minBidHbar != null && (
            <p className="text-[11px] text-muted mt-0.5">Min bid {listing.minBidHbar} HBAR</p>
          )}
        </div>

        {canCancel && (
          <Button
            variant="danger"
            onClick={() => onCancel(listing.id)}
            loading={actionLoading === `cancel-${listing.id}`}
            className="w-full sm:w-auto shrink-0"
          >
            Cancel listing
          </Button>
        )}
      </div>

      <p className="text-xs text-muted">
        Expires {formatExpiry(listing.expiresAt)}
      </p>

      <BidList
        bids={listing.bids}
        listingStatus={listing.status}
        onAccept={onAccept}
        onDecline={onDecline}
        loading={actionLoading}
        showTitle
        emptyLabel={
          pendingBids.length === 0
            ? "No bids yet — buyers can bid from the event resale tab."
            : null
        }
      />
    </Card>
  );
}
