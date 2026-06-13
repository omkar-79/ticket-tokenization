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
import GateEntryConfirm from "./GateEntryConfirm.jsx";

function ticketBadge(ticket) {
  if (ticket.status === "used") {
    return { label: "Checked in", variant: "success" };
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

function CheckedInStamp() {
  return (
    <div className="mt-4 pt-4 border-t border-success/20 flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-success/30 bg-success/10 text-success">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-success">Checked in at gate</p>
        <p className="text-xs text-muted mt-0.5">Enjoy the event — this ticket can&apos;t be transferred.</p>
      </div>
    </div>
  );
}

export default function TicketCard({
  ticket,
  accountId,
  askPrice,
  minBid,
  onAskChange,
  onMinBidChange,
  onList,
  listLoading,
  hasActiveListing,
  faceValue,
  onGateConfirmed,
}) {
  const defaultAsk = askPrice !== undefined && askPrice !== ""
    ? askPrice
    : (faceValue || ticket.priceHbar || "");
  const badge = ticketBadge(ticket);
  const isCheckedIn = ticket.status === "used";

  return (
    <motion.li {...fadeUp} transition={fadeUpTransition}>
      <Card className={isCheckedIn ? "border-success/25 bg-success/[0.03]" : ""}>
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
            <p className="font-mono text-xs text-accent mt-1 break-all">
              {ticket.ensName ?? ticket.tokenId}
            </p>
          </div>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>

        <p className="text-sm text-muted mb-3">
          {ticket.acquisition} · {ticket.acquiredAt}
          {ticket.priceHbar ? ` · ${ticket.priceHbar} HBAR` : ""}
        </p>

        <OwnershipHistory history={ticket.history} />

        {!isCheckedIn && accountId && (
          <GateEntryConfirm
            silent
            tokenId={ticket.tokenId}
            serial={ticket.serial}
            accountId={accountId}
            onConfirmed={onGateConfirmed}
          />
        )}

        {!isCheckedIn && (
          <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TicketPassQr
              tokenId={ticket.tokenId}
              serial={ticket.serial}
              accountId={accountId}
              ensName={ticket.ensName}
              size={120}
            />
            <p className="text-xs text-muted sm:max-w-[200px]">
              Tap <Link href={ticketDetailUrl(ticket.tokenId, ticket.serial)} className="text-accent">ticket pass</Link> for full-screen QR at the gate.
            </p>
          </div>
        )}

        {isCheckedIn && <CheckedInStamp />}

        {!hasActiveListing && !isCheckedIn && (
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

        {hasActiveListing && (
          <p className="mt-3 text-xs text-muted">
            Listed — manage in <Link href={walletTabUrl("selling")} className="text-accent">Selling</Link>
          </p>
        )}
      </Card>
    </motion.li>
  );
}
