"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "../../components/layout/PageHeader.jsx";
import PageTransition from "../../components/layout/PageTransition.jsx";
import { EventStats, TicketRegistry, formatRoyaltyPercent } from "../../components/events/EventCard.jsx";
import Alert from "../../components/ui/Alert.jsx";
import { CardSkeleton } from "../../components/ui/Skeleton.jsx";
import { useAccount } from "../../hooks/useAccount.js";
import { useEventTickets } from "../../hooks/useOrganizer.js";
import EventCompliancePanel from "../../components/events/EventCompliancePanel.jsx";
import { hashscanTokenUrl } from "../../lib/routes.js";

export default function EventDetailPage({ params }) {
  const router = useRouter();
  const { isOrganizer, loading: accountLoading, accountId } = useAccount();
  const [tokenId, setTokenId] = useState(null);
  const { event, tickets, royaltySummary, loading, error, refresh } = useEventTickets(tokenId);

  useEffect(() => {
    params.then((p) => setTokenId(p.tokenId));
  }, [params]);

  useEffect(() => {
    if (!accountLoading && !isOrganizer) {
      router.replace("/events");
    }
  }, [accountLoading, isOrganizer, router]);

  if (accountLoading || !isOrganizer) {
    return (
      <PageTransition>
        <CardSkeleton />
      </PageTransition>
    );
  }

  if (loading || !event) {
    return (
      <PageTransition>
        <CardSkeleton />
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <Alert shakeKey={error}>{error}</Alert>
        <Link href="/events" className="text-accent text-sm mt-4 inline-block">Back to My Events</Link>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <p className="text-xs text-muted mb-4">
        <Link href="/events" className="hover:text-accent transition-colors">My Events</Link>
        <span className="mx-2">/</span>
        <span className="text-text">{event.name}</span>
      </p>

      <PageHeader
        title={event.name}
        description={
          <>
            <span className="font-mono text-xs">{event.token_id}</span>
            {" · "}
            {event.primary_price_hbar} HBAR face value
            {" · "}
            {formatRoyaltyPercent(event)} resale royalty
            {" · "}
            <a
              href={hashscanTokenUrl(event.token_id)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-dim"
            >
              HashScan
            </a>
          </>
        }
      />

      <EventStats token={event} tickets={tickets} royaltySummary={royaltySummary} />

      <EventCompliancePanel
        tokenId={event.token_id}
        event={event}
        accountId={accountId}
        onUpdated={refresh}
      />

      <h2 className="text-sm uppercase tracking-widest text-muted mb-4">Ticket registry</h2>
      <TicketRegistry tickets={tickets} tokenId={event.token_id} />
    </PageTransition>
  );
}
