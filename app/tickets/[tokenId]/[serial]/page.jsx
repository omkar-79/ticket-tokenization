"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import PageTransition from "../../../components/layout/PageTransition.jsx";
import Card from "../../../components/ui/Card.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import { CardSkeleton } from "../../../components/ui/Skeleton.jsx";
import OwnershipHistory from "../../../components/tickets/OwnershipHistory.jsx";
import TicketPassQr from "../../../components/tickets/TicketPassQr.jsx";
import GateEntryConfirm from "../../../components/tickets/GateEntryConfirm.jsx";
import TicketCheckedInOverlay from "../../../components/tickets/TicketCheckedInOverlay.jsx";
import { useAccount } from "../../../hooks/useAccount.js";
import { useTicketCheckInWatch } from "../../../hooks/useTicketCheckInWatch.js";
import { fadeUp, fadeUpTransition } from "../../../lib/motion.js";

export default function TicketDetailPage({ params }) {
  const { accountId } = useAccount();
  const [resolved, setResolved] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    params.then(setResolved);
  }, [params]);

  const loadTicket = useCallback(async () => {
    if (!resolved) return;
    const { tokenId, serial } = resolved;
    const res = await fetch(`/api/tickets/${encodeURIComponent(tokenId)}/${serial}`);
    const d = await res.json();
    if (!res.ok) throw new Error(d.error);
    setTicket(d);
  }, [resolved]);

  useEffect(() => {
    if (!resolved) return;
    setLoading(true);
    loadTicket()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [resolved, loadTicket]);

  const onCheckedIn = useCallback((data) => {
    setTicket((prev) => (prev ? { ...prev, ...data, status: "used" } : data));
  }, []);

  const { celebration, dismissCelebration } = useTicketCheckInWatch(
    resolved?.tokenId,
    resolved?.serial != null ? Number(resolved.serial) : null,
    {
      enabled: Boolean(resolved && ticket && ticket.status !== "used"),
      onCheckedIn,
    }
  );

  useEffect(() => {
    if (!celebration) return undefined;
    const timer = setTimeout(() => dismissCelebration(), 3500);
    return () => clearTimeout(timer);
  }, [celebration, dismissCelebration]);

  if (loading) {
    return (
      <PageTransition>
        <CardSkeleton />
      </PageTransition>
    );
  }

  if (error || !ticket) {
    return (
      <PageTransition>
        <p className="text-error text-sm">{error ?? "Ticket not found"}</p>
        <Link href="/wallet" className="text-accent text-sm mt-4 inline-block">Back to My Tickets</Link>
      </PageTransition>
    );
  }

  const isOwner = accountId && ticket.ownershipHistory?.length
    ? ticket.ownershipHistory[ticket.ownershipHistory.length - 1]?.owner_account_id === accountId
    : false;

  return (
    <PageTransition>
      <motion.article {...fadeUp} transition={fadeUpTransition}>
        {isOwner && ticket.status !== "used" && accountId && (
          <GateEntryConfirm
            tokenId={ticket.tokenId}
            serial={ticket.serial}
            accountId={accountId}
            onConfirmed={loadTicket}
          />
        )}

        <Card className="max-w-md mx-auto" variant={ticket.status === "used" ? "default" : "accent"}>
          <div className="flex items-start justify-between gap-3 mb-6">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Ticket pass</p>
            {ticket.status === "used" && (
              <Badge variant="success">Checked in</Badge>
            )}
          </div>

          <p className="text-6xl font-medium tracking-tight text-accent mb-2">
            #{ticket.serial}
          </p>

          <h1 className="text-xl font-medium mb-1">
            {ticket.event ?? ticket.tokenName ?? "World Cup Ticket"}
          </h1>

          {ticket.section && (
            <p className="text-muted text-sm mb-6">Section {ticket.section}</p>
          )}

          <div className="border-t border-border pt-6 mb-6">
            <TicketPassQr
              tokenId={ticket.tokenId}
              serial={ticket.serial}
              accountId={isOwner ? accountId : null}
              ensName={ticket.ensName}
              used={ticket.status === "used"}
              size={180}
            />
          </div>

          <div className="space-y-2 text-sm border-t border-border pt-6">
            <Row label="Token" value={ticket.tokenId} mono />
            <Row label="Status" value={
              <Badge variant={ticket.status === "used" ? "success" : "default"}>
                {ticket.status === "used" ? "Checked in" : ticket.status.replace(/_/g, " ")}
              </Badge>
            } />
            {ticket.metadataUri && (
              <Row label="Metadata" value={ticket.metadataUri} mono />
            )}
          </div>

          {ticket.ownershipHistory?.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border">
              <OwnershipHistory history={ticket.ownershipHistory.map((h) => ({
                id: h.id,
                acquisition: h.acquisition,
                owner_account_id: h.owner_account_id,
                price_hbar: h.price_hbar,
                tx_id: h.tx_id,
              }))} />
            </div>
          )}

          <Link href="/wallet" className="inline-block mt-8 text-sm text-accent hover:text-accent-dim">
            Back to My Tickets
          </Link>
        </Card>
      </motion.article>

      <AnimatePresence>
        {celebration && (
          <TicketCheckedInOverlay
            serial={celebration.serial}
            eventName={celebration.eventName}
            variant="holder"
            fullscreen
            onDone={dismissCelebration}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className={mono ? "font-mono text-xs text-right" : ""}>{value}</span>
    </div>
  );
}
