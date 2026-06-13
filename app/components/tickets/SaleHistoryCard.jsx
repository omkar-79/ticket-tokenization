"use client";

import Link from "next/link";
import Card from "../ui/Card.jsx";
import Badge from "../ui/Badge.jsx";
import { ticketDetailUrl } from "../../lib/routes.js";

function formatWhen(iso) {
  if (!iso) return "—";
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

function bidStatusVariant(status) {
  if (status === "completed" || status === "accepted") return "accent";
  if (status === "rejected" || status === "cancelled" || status === "expired") return "default";
  return "pending";
}

function bidStatusLabel(status) {
  if (status === "completed") return "Accepted · sold";
  if (status === "accepted") return "Accepted";
  return status;
}

function PriceChip({ label, amount, variant = "muted" }) {
  const styles =
    variant === "accent"
      ? "border-accent/25 bg-accent/5"
      : "border-border/70 bg-bg/40";

  const amountStyles = variant === "accent" ? "text-accent" : "text-text";

  return (
    <div className={`inline-flex w-fit max-w-full flex-col rounded-xl border px-3 py-2 ${styles}`}>
      <p className="text-[10px] uppercase tracking-widest text-muted">{label}</p>
      <p className={`text-xl font-semibold tabular-nums tracking-tight leading-tight ${amountStyles}`}>
        {amount}
        <span className="text-xs font-normal text-muted ml-1">HBAR</span>
      </p>
    </div>
  );
}

function HistoryBidList({ bids, winningBidId }) {
  if (!bids?.length) return null;

  return (
    <div className="border-t border-border/80 pt-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[10px] uppercase tracking-widest text-muted">Bids</h3>
        <span className="text-[10px] text-muted tabular-nums">{bids.length} total</span>
      </div>
      <ul className="space-y-2">
        {bids.map((b) => {
          const isWinner = b.id === winningBidId;
          return (
            <li
              key={b.id}
              className={`rounded-xl border px-3 py-3 sm:flex sm:items-center sm:justify-between sm:gap-3 ${
                isWinner
                  ? "border-accent/30 bg-accent/5"
                  : "border-border/70 bg-bg/40"
              }`}
            >
              <div className="min-w-0">
                <p className="font-mono text-[11px] text-muted truncate">{b.bidderAccountId}</p>
                <p className="mt-1 flex flex-wrap items-baseline gap-2">
                  <span
                    className={`text-lg font-semibold tabular-nums ${
                      isWinner ? "text-accent" : "text-text"
                    }`}
                  >
                    {b.bidPriceHbar} HBAR
                  </span>
                  <Badge variant={bidStatusVariant(b.status)} className="capitalize">
                    {bidStatusLabel(b.status)}
                  </Badge>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function MarketplaceSaleCard({ sale }) {
  const winningBid = sale.winningBid;
  const saleAt = winningBid?.respondedAt ?? sale.createdAt;

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={ticketDetailUrl(sale.tokenId, sale.serial)}
            className="text-lg font-semibold tracking-tight text-text hover:text-accent transition-colors line-clamp-2"
          >
            {sale.eventName ?? "Event"}
          </Link>
          <p className="text-sm text-muted mt-1">
            Ticket #{sale.serial}
            {sale.eventSymbol ? ` · ${sale.eventSymbol}` : ""}
          </p>
          <p className="font-mono text-[11px] text-muted/80 mt-1 truncate">{sale.tokenId}</p>
        </div>
        <Badge variant="accent" className="shrink-0">
          Sold
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <PriceChip label="Ask price" amount={sale.askPriceHbar} variant="muted" />
        <PriceChip label="Sale price" amount={sale.salePriceHbar} variant="accent" />
      </div>

      <dl className="space-y-2 text-xs text-muted">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <div>
            <dt className="text-[10px] uppercase tracking-widest text-muted/80">Listed</dt>
            <dd className="mt-0.5">{formatWhen(sale.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-widest text-muted/80">Sold</dt>
            <dd className="mt-0.5">{formatWhen(saleAt)}</dd>
          </div>
        </div>
        {sale.buyerAccountId && (
          <div>
            <dt className="text-[10px] uppercase tracking-widest text-muted/80">Buyer</dt>
            <dd className="mt-0.5 font-mono text-[11px] text-muted break-all">{sale.buyerAccountId}</dd>
          </div>
        )}
      </dl>

      <HistoryBidList bids={sale.bids} winningBidId={winningBid?.id} />
    </Card>
  );
}

export function FormerTicketCard({ ticket }) {
  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={ticketDetailUrl(ticket.tokenId, ticket.serial)}
            className="text-lg font-semibold tracking-tight text-text hover:text-accent transition-colors line-clamp-2"
          >
            {ticket.eventName ?? "Event"}
          </Link>
          <p className="text-sm text-muted mt-1">Ticket #{ticket.serial}</p>
          <p className="font-mono text-[11px] text-muted/80 mt-1 truncate">{ticket.tokenId}</p>
        </div>
        <Badge variant="default" className="shrink-0">
          Previously owned
        </Badge>
      </div>

      {(ticket.boughtPriceHbar != null || ticket.soldPriceHbar != null) && (
        <div className="flex flex-wrap items-center gap-3">
          {ticket.boughtPriceHbar != null && (
            <PriceChip label="Bought at" amount={ticket.boughtPriceHbar} variant="muted" />
          )}
          {ticket.soldPriceHbar != null && (
            <PriceChip label="Sold for" amount={ticket.soldPriceHbar} variant="accent" />
          )}
        </div>
      )}

      <dl className="space-y-2 text-xs text-muted">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <div>
            <dt className="text-[10px] uppercase tracking-widest text-muted/80">You held</dt>
            <dd className="mt-0.5">{formatWhen(ticket.heldFrom)}</dd>
          </div>
          {ticket.heldUntil && (
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-muted/80">Transferred</dt>
              <dd className="mt-0.5">{formatWhen(ticket.heldUntil)}</dd>
            </div>
          )}
        </div>
        {ticket.soldTo && (
          <div>
            <dt className="text-[10px] uppercase tracking-widest text-muted/80">To</dt>
            <dd className="mt-0.5 font-mono text-[11px] text-muted break-all">
              {ticket.soldTo}
              {ticket.saleTxId && (
                <>
                  {" · "}
                  <a
                    href={`https://hashscan.io/testnet/transaction/${ticket.saleTxId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-dim transition-colors"
                  >
                    View tx
                  </a>
                </>
              )}
            </dd>
          </div>
        )}
      </dl>
    </Card>
  );
}
