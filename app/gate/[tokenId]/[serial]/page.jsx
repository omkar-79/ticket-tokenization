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
import { useToast } from "../../../components/ui/ToastHost.jsx";
import { apiPost } from "../../../lib/api.js";
import { eventDetailUrl } from "../../../lib/routes.js";

/** Fallback when an organizer opens a ticket QR with the phone camera app. */
export default function GateScanPage({ params }) {
  const router = useRouter();
  const { toast } = useToast();
  const { accountId, isOrganizer, loading: accountLoading } = useAccount();
  const [tokenId, setTokenId] = useState(null);
  const [serial, setSerial] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);

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

  async function grantEntry() {
    if (!accountId || !tokenId || serial == null) return;
    setScanLoading(true);
    setError(null);
    try {
      const data = await apiPost(
        `/api/tokens/${encodeURIComponent(tokenId)}/gate-scan`,
        { serial },
        accountId
      );
      toast(data.message ?? "Entry granted", "success");
      const res = await fetch(`/api/tickets/${encodeURIComponent(tokenId)}/${serial}`);
      const d = await res.json();
      if (res.ok) setTicket(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setScanLoading(false);
    }
  }

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
        description="Tip: use Scan ticket QR on your event page next time — it's faster."
      />

      {error && (
        <div className="mb-6 max-w-md mx-auto">
          <Alert shakeKey={error}>{error}</Alert>
        </div>
      )}

      <Card className="max-w-md mx-auto space-y-4">
        <div className="flex justify-between items-start gap-3">
          <div>
            <p className="text-4xl font-medium text-accent tabular-nums">#{serial}</p>
            <p className="text-sm mt-2">{ticket?.event ?? "Ticket"}</p>
          </div>
          <Badge variant={isUsed ? "pending" : "accent"}>
            {isUsed ? "Already checked in" : "Ready"}
          </Badge>
        </div>

        {!isUsed ? (
          <Button onClick={grantEntry} loading={scanLoading} className="w-full">
            Check in this ticket
          </Button>
        ) : (
          <p className="text-sm text-muted">This ticket was already scanned.</p>
        )}

        <Button variant="ghost" onClick={() => router.push(eventDetailUrl(tokenId))} className="w-full">
          Back to event
        </Button>
      </Card>
    </PageTransition>
  );
}
