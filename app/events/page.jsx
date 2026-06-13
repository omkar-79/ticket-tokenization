"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import PageHeader from "../components/layout/PageHeader.jsx";
import PageTransition, { AuthGate } from "../components/layout/PageTransition.jsx";
import EventCard, { formatHbar } from "../components/events/EventCard.jsx";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { LabeledInput } from "../components/ui/FormField.jsx";
import Alert from "../components/ui/Alert.jsx";
import { CardSkeleton } from "../components/ui/Skeleton.jsx";
import { useAccount } from "../hooks/useAccount.js";
import { useOrganizerTokens } from "../hooks/useOrganizer.js";
import { useApiMutation } from "../hooks/useApi.js";
import { apiPost } from "../lib/api.js";
import { staggerContainer } from "../lib/motion.js";
import { useMotionSafe } from "../lib/motion.js";

export default function EventsPage() {
  const { accountId, isOrganizer, loading: accountLoading } = useAccount();
  const { tokens, loading, error, refresh } = useOrganizerTokens();
  const { mutate, loading: creating, error: mutateError, setError } = useApiMutation();
  const [showCreate, setShowCreate] = useState(false);
  const [adminSecret, setAdminSecret] = useState("");
  const [createSuccess, setCreateSuccess] = useState(null);
  const [form, setForm] = useState({
    name: "World Cup Ticket",
    symbol: "WCT",
    maxSupply: 100,
    faceValueHbar: 50,
    royaltyPercent: 10,
  });
  const { stagger } = useMotionSafe();

  const portfolioResaleFees = tokens.reduce(
    (sum, t) => sum + (t.totalResaleFeesHbar ?? 0),
    0
  );
  const portfolioResales = tokens.reduce(
    (sum, t) => sum + (t.totalSecondarySales ?? 0),
    0
  );

  async function promoteSelf() {
    try {
      await mutate(async () => {
        const res = await fetch("/api/admin/promote-organizer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Secret": adminSecret,
          },
          body: JSON.stringify({ accountId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
      }, { successMessage: "Promoted to organizer" });
      setAdminSecret("");
      window.location.reload();
    } catch {
      /* handled */
    }
  }

  async function createToken() {
    setCreateSuccess(null);
    try {
      const data = await mutate(
        () => apiPost("/api/tokens", form, accountId),
        { successMessage: "Event collection created" }
      );
      setCreateSuccess(data);
      setShowCreate(false);
      await refresh();
    } catch {
      /* handled */
    }
  }

  if (accountLoading) {
    return (
      <PageTransition>
        <CardSkeleton />
      </PageTransition>
    );
  }

  if (!accountId) {
    return (
      <PageTransition>
        <PageHeader title="My Events" description="Manage your ticket collections and track ownership." />
        <AuthGate />
      </PageTransition>
    );
  }

  if (!isOrganizer) {
    return (
      <PageTransition>
        <PageHeader
          title="My Events"
          description="Organizer accounts create collections and track every minted ticket."
        />
        <Card className="max-w-md space-y-4">
          <p className="text-sm text-muted leading-relaxed">
            You need an organizer account. Select <strong className="text-text">Organizer</strong> when{" "}
            <Link href="/onboard" className="text-accent">creating a wallet</Link>, or promote this account below.
          </p>
          <LabeledInput
            id="admin-secret"
            label="Admin secret"
            type="password"
            value={adminSecret}
            onChange={(e) => setAdminSecret(e.target.value)}
          />
          <Button onClick={promoteSelf} loading={creating} variant="secondary">
            Promote this account
          </Button>
          {(mutateError) && <Alert shakeKey={mutateError}>{mutateError}</Alert>}
        </Card>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-[var(--section-y)]">
        <PageHeader
          title="My Events"
          description="Your collections. Open an event to see every minted ticket and who holds it."
        />
        <Button onClick={() => setShowCreate((s) => !s)} variant={showCreate ? "ghost" : "primary"}>
          {showCreate ? "Cancel" : "New event"}
        </Button>
      </div>

      {(error || mutateError) && (
        <div className="mb-6">
          <Alert shakeKey={error || mutateError}>{error || mutateError}</Alert>
        </div>
      )}

      {showCreate && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="space-y-5 max-w-lg">
            <div>
              <h2 className="text-sm uppercase tracking-widest text-muted">Create collection</h2>
              <p className="text-sm text-muted mt-2 leading-relaxed">
                Define your event on Hedera. Face value is what fans pay on primary sale; royalty applies to every resale on-chain.
              </p>
            </div>

            <LabeledInput
              id="event-name"
              label="Event name"
              hint="Shown to fans on the marketplace, e.g. World Cup Final."
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            <LabeledInput
              id="event-symbol"
              label="Token symbol"
              hint="Short ticker for the NFT collection (max a few characters)."
              value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value })}
            />

            <LabeledInput
              id="event-supply"
              label="Max supply"
              type="number"
              min={1}
              hint="Maximum tickets that can ever be minted for this event."
              value={form.maxSupply}
              onChange={(e) => setForm({ ...form, maxSupply: e.target.value })}
            />

            <LabeledInput
              id="event-face-value"
              label="Face value (HBAR)"
              type="number"
              min={1}
              hint="Primary sale price — fans pay this when buying from the marketplace."
              value={form.faceValueHbar}
              onChange={(e) => setForm({ ...form, faceValueHbar: e.target.value })}
            />

            <LabeledInput
              id="event-royalty"
              label="Resale royalty (%)"
              type="number"
              min={0}
              max={50}
              hint="Your cut on every fan-to-fan resale, enforced on-chain. Cannot be changed after creation. 0–50%."
              value={form.royaltyPercent}
              onChange={(e) => setForm({ ...form, royaltyPercent: e.target.value })}
            />

            <Button onClick={createToken} loading={creating}>
              Create event
            </Button>
          </Card>
        </motion.div>
      )}

      {createSuccess && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 text-sm text-success border border-success/20 rounded-lg px-4 py-3"
        >
          Created {createSuccess.tokenId}.{" "}
          <Link
            href={`/events/${encodeURIComponent(createSuccess.tokenId)}`}
            className="text-accent underline"
          >
            Open event registry
          </Link>
          <span className="text-muted"> · Listed for fan purchase</span>
        </motion.div>
      )}

      {loading ? (
        <ul className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </ul>
      ) : tokens.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-lg">
          <p className="text-muted text-sm mb-4">No events yet.</p>
          <Button onClick={() => setShowCreate(true)}>Create your first event</Button>
        </div>
      ) : (
        <>
          {(portfolioResaleFees > 0 || portfolioResales > 0) && (
            <div className="mb-6 grid grid-cols-2 gap-3 max-w-md">
              <div className="bg-surface border border-border rounded-lg px-4 py-3">
                <p className="text-[10px] uppercase tracking-widest text-muted mb-1">All events — resale fees</p>
                <p className="text-2xl font-medium text-accent tabular-nums">
                  {formatHbar(portfolioResaleFees)} HBAR
                </p>
              </div>
              <div className="bg-surface border border-border rounded-lg px-4 py-3">
                <p className="text-[10px] uppercase tracking-widest text-muted mb-1">Total resales</p>
                <p className="text-2xl font-medium tabular-nums">{portfolioResales}</p>
              </div>
            </div>
          )}
          <motion.ul variants={stagger} initial="initial" animate="animate" className="space-y-4">
            {tokens.map((t) => (
              <EventCard key={t.token_id} token={t} />
            ))}
          </motion.ul>
        </>
      )}
    </PageTransition>
  );
}
