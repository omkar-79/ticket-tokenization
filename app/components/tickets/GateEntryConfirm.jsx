"use client";

import { useEffect, useRef, useState } from "react";
import Card from "../ui/Card.jsx";
import WorldIdTrigger from "../world-id/WorldIdTrigger.jsx";
import { apiGet, apiPost } from "../../lib/api.js";

const POLL_MS = 2000;

export default function GateEntryConfirm({ tokenId, serial, accountId, onConfirmed }) {
  const [challenge, setChallenge] = useState(null);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [needsRetry, setNeedsRetry] = useState(false);
  const challengeIdRef = useRef(null);

  useEffect(() => {
    challengeIdRef.current = challenge?.id ?? null;
  }, [challenge]);

  useEffect(() => {
    if (!accountId || !tokenId || serial == null) return undefined;

    let cancelled = false;

    async function poll() {
      try {
        const data = await apiGet(
          `/api/tickets/${encodeURIComponent(tokenId)}/${serial}/gate-challenge`,
          accountId
        );
        if (cancelled) return;
        if (data.pending) {
          setChallenge((prev) => {
            if (prev?.id !== data.challengeId) {
              setNeedsRetry(false);
              setError(null);
            }
            return { id: data.challengeId, expiresAt: data.expiresAt };
          });
        } else {
          setChallenge(null);
          setNeedsRetry(false);
        }
      } catch {
        /* ignore poll errors */
      }
    }

    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [accountId, tokenId, serial]);

  async function handleVerify(proof) {
    const challengeId = challengeIdRef.current;
    if (!challengeId) {
      throw new Error("Gate challenge expired — ask the organizer to scan again");
    }

    setConfirming(true);
    setError(null);
    setNeedsRetry(false);
    try {
      await apiPost(
        `/api/tickets/${encodeURIComponent(tokenId)}/${serial}/gate-challenge/confirm`,
        { challengeId, proof },
        accountId
      );
      setChallenge(null);
      onConfirmed?.();
      return proof;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Gate entry confirmation failed";
      setError(message);
      setNeedsRetry(true);
      throw new Error(message);
    } finally {
      setConfirming(false);
    }
  }

  function handleWorldIdError(message) {
    setError(message);
    setNeedsRetry(true);
  }

  if (!challenge) return null;

  return (
    <>
      <Card variant="accent" className="mb-6 border-accent/40 bg-accent/5">
        <p className="text-[10px] uppercase tracking-widest text-accent mb-2">Gate check-in</p>
        <h3 className="text-lg font-semibold mb-2">Confirm entry</h3>
        <p className="text-sm text-muted leading-relaxed">
          {needsRetry
            ? "Verification did not complete. Tap retry below to open World App again."
            : "An organizer scanned your ticket. Opening World App for verification…"}
        </p>
        {error && <p className="text-sm text-error mt-3">{error}</p>}
        {needsRetry && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setNeedsRetry(false);
              setChallenge((c) => (c ? { ...c, retry: Date.now() } : c));
            }}
            className="mt-3 text-sm text-accent hover:text-accent-dim"
          >
            Retry World ID
          </button>
        )}
      </Card>

      <WorldIdTrigger
        autoStart
        autoStartKey={challenge.retry ? `${challenge.id}-${challenge.retry}` : challenge.id}
        hideButton
        onVerify={handleVerify}
        onError={handleWorldIdError}
        disabled={confirming}
      />
    </>
  );
}
