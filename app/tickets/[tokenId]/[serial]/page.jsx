"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import PageTransition from "../../../components/layout/PageTransition.jsx";
import Card from "../../../components/ui/Card.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import { CardSkeleton } from "../../../components/ui/Skeleton.jsx";
import OwnershipHistory from "../../../components/tickets/OwnershipHistory.jsx";
import TicketPassQr from "../../../components/tickets/TicketPassQr.jsx";
import { fadeUp, fadeUpTransition } from "../../../lib/motion.js";

export default function TicketDetailPage({ params }) {
  const [resolved, setResolved] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    params.then(setResolved);
  }, [params]);

  useEffect(() => {
    if (!resolved) return;
    const { tokenId, serial } = resolved;
    fetch(`/api/tickets/${encodeURIComponent(tokenId)}/${serial}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error);
        setTicket(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [resolved]);

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

  return (
    <PageTransition>
      <motion.article {...fadeUp} transition={fadeUpTransition}>
        <Card className="max-w-md mx-auto" variant="accent">
          <p className="text-xs uppercase tracking-[0.2em] text-muted mb-6">Ticket pass</p>

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
              ensName={ticket.ensName}
              used={ticket.status === "used"}
              size={180}
            />
          </div>

          <div className="space-y-2 text-sm border-t border-border pt-6">
            <Row label="Token" value={ticket.tokenId} mono />
            <Row label="Status" value={
              <Badge variant={ticket.status === "used" ? "pending" : "default"}>
                {ticket.status === "used" ? "Used at gate" : ticket.status.replace(/_/g, " ")}
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
