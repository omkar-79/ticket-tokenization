"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageTransition from "../../../components/layout/PageTransition.jsx";
import PageHeader from "../../../components/layout/PageHeader.jsx";
import Card from "../../../components/ui/Card.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import Alert from "../../../components/ui/Alert.jsx";
import { CardSkeleton } from "../../../components/ui/Skeleton.jsx";
import { useAccount } from "../../../hooks/useAccount.js";
import { eventDetailUrl } from "../../../lib/routes.js";

/** Fallback when an organizer opens a legacy ticket URL from the phone camera app. */
export default function GateScanPage({ params }) {
  const router = useRouter();
  const { accountId, isOrganizer, loading: accountLoading } = useAccount();
  const [tokenId, setTokenId] = useState(null);
  const [serial, setSerial] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    params.then((p) => {
      setTokenId(p.tokenId);
      setSerial(Number(p.serial));
    });
  }, [params]);

  useEffect(() => {
    if (!tokenId || serial == null) return;
    setLoading(true);
    fetch(`/api/tickets/${encodeURIComponent(tokenId)}/${serial}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error);
        setTicket(d);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tokenId, serial]);

  if (accountLoading || loading) {
    return (
      <PageTransition>
        <CardSkeleton />
      </PageTransition>
    );
  }

  if (!isOrganizer) {
    return (
      <PageTransition>
        <PageHeader title="Ticket check-in" description="For event staff only." />
        <Card className="max-w-md mx-auto text-center space-y-4">
          <p className="text-sm text-muted">Please log in with your organizer account.</p>
          <Link
            href={`/login?next=${encodeURIComponent(`/gate/${tokenId}/${serial}`)}`}
            className="text-accent text-sm"
          >
            Log in
          </Link>
        </Card>
      </PageTransition>
    );
  }

  if (error && !ticket) {
    return (
      <PageTransition>
        <Alert shakeKey={error}>{error}</Alert>
        <Link href="/events" className="text-accent text-sm mt-4 inline-block">My Events</Link>
      </PageTransition>
    );
  }

  const isUsed = ticket?.status === "used";

  return (
    <PageTransition>
      <PageHeader
        title="Ticket check-in"
        description="Gate entry now requires scanning the fan's signed QR from their ticket pass."
      />

      <Card className="max-w-md mx-auto space-y-4">
        <div className="flex justify-between items-start gap-3">
          <div>
            <p className="text-4xl font-medium text-accent tabular-nums">#{serial}</p>
            <p className="text-sm mt-2">{ticket?.event ?? "Ticket"}</p>
          </div>
          <Badge variant={isUsed ? "pending" : "accent"}>
            {isUsed ? "Already checked in" : "Needs QR scan"}
          </Badge>
        </div>

        <p className="text-sm text-muted leading-relaxed">
          Direct check-in from this link is disabled. Ask the fan to open their{" "}
          <strong className="text-text">ticket pass</strong>, then use{" "}
          <strong className="text-text">Scan ticket QR</strong> on your event page.
          After you scan, they confirm with World ID on their phone.
        </p>

        {!isUsed && (
          <Button onClick={() => router.push(eventDetailUrl(tokenId))} className="w-full">
            Open event scanner
          </Button>
        )}

        {isUsed && (
          <p className="text-sm text-muted">This ticket was already scanned at the gate.</p>
        )}

        <Button variant="ghost" onClick={() => router.push(eventDetailUrl(tokenId))} className="w-full">
          Back to event
        </Button>
      </Card>
    </PageTransition>
  );
}
