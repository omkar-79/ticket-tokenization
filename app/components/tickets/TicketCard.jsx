"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Card from "../ui/Card.jsx";
import Badge from "../ui/Badge.jsx";
import Button from "../ui/Button.jsx";
import Input from "../ui/Input.jsx";
import { fadeUp, fadeUpTransition } from "../../lib/motion.js";
import { ticketDetailUrl, walletTabUrl } from "../../lib/routes.js";
import OwnershipHistory from "./OwnershipHistory.jsx";
import TicketPassQr from "./TicketPassQr.jsx";

function ticketBadge(ticket) {
  if (ticket.status === "used") {
    return { label: "Used at gate", variant: "pending" };
  }
  if (ticket.status === "listed_for_resale") {
    return { label: "Listed", variant: "pending" };
  }
  const resales = (ticket.history ?? []).filter((h) => h.acquisition === "secondary").length;
  if (resales > 0) {
    return { label: `Resold ${resales}×`, variant: "pending" };
  }
  return { label: "Primary", variant: "default" };
}

export default function TicketCard({
  ticket,
  askPrice,
  minBid,
  onAskChange,
  onMinBidChange,
  onList,
  listLoading,
  hasActiveListing,
  faceValue,
}) {
  const defaultAsk = askPrice !== undefined && askPrice !== ""
    ? askPrice
    : (faceValue || ticket.priceHbar || "");
  const badge = ticketBadge(ticket);

  return (
    <motion.li {...fadeUp} transition={fadeUpTransition}>
      <Card>
        <div className="flex justify-between items-start mb-2">
          <div>
            <Link
              href={ticketDetailUrl(ticket.tokenId, ticket.serial)}
              className="text-lg font-medium hover:text-accent transition-colors"
            >
              {ticket.eventName ?? "Ticket"}
            </Link>
            <p className="text-sm text-muted mt-0.5">
              #{ticket.serial}
              {ticket.eventSymbol ? ` · ${ticket.eventSymbol}` : ""}
            </p>
            <p className="font-mono text-xs text-muted mt-1">{ticket.tokenId}</p>
          </div>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>

        <p className="text-sm text-muted mb-3">
          {ticket.acquisition} · {ticket.acquiredAt}
          {ticket.priceHbar ? ` · ${ticket.priceHbar} HBAR` : ""}
        </p>

        <OwnershipHistory history={ticket.history} />

        {ticket.status !== "used" && (
          <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TicketPassQr tokenId={ticket.tokenId} serial={ticket.serial} ensName={ticket.ensName} size={120} />
            <p className="text-xs text-muted sm:max-w-[200px]">
              Tap <Link href={ticketDetailUrl(ticket.tokenId, ticket.serial)} className="text-accent">ticket pass</Link> for full-screen QR at the gate.
            </p>
          </div>
        )}

        {!hasActiveListing && ticket.status !== "used" && (
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex-1 min-w-[120px]">
                <span className="text-xs text-muted uppercase tracking-widest block mb-1.5">Ask price</span>
                <Input
                  type="number"
                  value={defaultAsk}
                  onChange={(e) => onAskChange(e.target.value)}
                />
              </label>
              {onMinBidChange && (
                <label className="flex-1 min-w-[120px]">
                  <span className="text-xs text-muted uppercase tracking-widest block mb-1.5">Min bid</span>
                  <Input
                    type="number"
                    placeholder="Optional"
                    value={minBid ?? ""}
                    onChange={(e) => onMinBidChange(e.target.value)}
                  />
                </label>
              )}
            </div>
            <Button onClick={onList} loading={listLoading} variant="secondary" className="w-full sm:w-auto">
              List for resale
            </Button>
          </div>
        )}

        {ticket.status === "used" && (
          <p className="mt-3 text-xs text-muted border-t border-border pt-3">
            This ticket was scanned at the gate and cannot be resold.
          </p>
        )}

        {hasActiveListing && (
          <p className="mt-3 text-xs text-muted">
            Listed — manage in <Link href={walletTabUrl("selling")} className="text-accent">Selling</Link>
          </p>
        )}
      </Card>
    </motion.li>
  );
}
