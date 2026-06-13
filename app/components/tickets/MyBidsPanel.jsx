"use client";

import Link from "next/link";
import Card from "../ui/Card.jsx";
import Button from "../ui/Button.jsx";
import Badge from "../ui/Badge.jsx";
import { ticketDetailUrl } from "../../lib/routes.js";

export default function MyBidsPanel({
  pendingBids,
  acceptedBids,
  highlightBid,
  onConfirm,
}) {
  const hasAccepted = acceptedBids.length > 0;
  const hasPending = pendingBids.length > 0;

  if (!hasAccepted && !hasPending) {
    return (
      <div className="text-center py-16 border border-dashed border-border rounded-lg">
        <p className="text-muted text-sm mb-2">You have not placed any resale bids yet.</p>
        <p className="text-muted text-xs">
          Browse fan listings in <strong className="text-text">Browse resale</strong> to find tickets below face value.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {hasAccepted && (
        <section>
          <h2 className="text-sm uppercase tracking-widest text-pending mb-1">Confirm purchase</h2>
          <p className="text-sm text-muted mb-4">
            Your bid was accepted. Verify with World ID and pay to complete the transfer.
          </p>
          <ul className="space-y-3">
            {acceptedBids.map((b) => (
              <li key={b.id}>
                <Card
                  variant={String(b.id) === highlightBid ? "accent" : "pending"}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div>
                    <Link
                      href={ticketDetailUrl(b.tokenId, b.serial)}
                      className="font-medium hover:text-accent"
                    >
                      Ticket #{b.serial}
                    </Link>
                    <p className="font-mono text-xs text-muted mt-1">{b.tokenId}</p>
                    <p className="text-sm mt-2">
                      Your winning bid: <strong className="text-accent">{b.bidPriceHbar} HBAR</strong>
                      <span className="text-muted"> · ask was {b.askPriceHbar}</span>
                    </p>
                    {b.confirmBlocked && (
                      <p className="text-xs text-error mt-2 leading-relaxed">{b.confirmBlocked}</p>
                    )}
                  </div>
                  <Button
                    onClick={() => onConfirm(b.id)}
                    disabled={Boolean(b.confirmBlocked)}
                    className="w-full sm:w-auto shrink-0"
                  >
                    Verify World ID & pay
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasPending && (
        <section>
          <h2 className="text-sm uppercase tracking-widest text-muted mb-4">Waiting on seller</h2>
          <ul className="space-y-3">
            {pendingBids.map((b) => (
              <li key={b.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link
                        href={ticketDetailUrl(b.tokenId, b.serial)}
                        className="font-medium hover:text-accent"
                      >
                        Ticket #{b.serial}
                      </Link>
                      <p className="font-mono text-xs text-muted mt-1">{b.tokenId}</p>
                    </div>
                    <Badge variant="pending">Pending</Badge>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted mb-1">Your bid</p>
                      <p className="font-medium text-accent tabular-nums">{b.bidPriceHbar} HBAR</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted mb-1">Ask price</p>
                      <p className="tabular-nums">{b.askPriceHbar} HBAR</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[10px] uppercase tracking-widest text-muted mb-1">Seller</p>
                      <p className="font-mono text-xs truncate">{b.sellerAccountId}</p>
                    </div>
                  </div>
                  {b.bidPriceHbar >= b.askPriceHbar && (
                    <p className="text-xs text-muted mt-3">
                      At or above ask — seller can accept anytime.
                    </p>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
