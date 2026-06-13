"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "../../lib/api.js";
import { ticketDetailUrl } from "../../lib/routes.js";

const POLL_MS = 2000;

/** Wallet banner — directs holder to ticket pass (World ID confirm stays on pass page only). */
export default function GateChallengeAlert({ tokenId, serial, accountId }) {
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!accountId || !tokenId || serial == null) return undefined;

    let cancelled = false;

    async function poll() {
      try {
        const data = await apiGet(
          `/api/tickets/${encodeURIComponent(tokenId)}/${serial}/gate-challenge`,
          accountId
        );
        if (!cancelled) setPending(Boolean(data.pending));
      } catch {
        /* ignore */
      }
    }

    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [accountId, tokenId, serial]);

  if (!pending) return null;

  return (
    <div className="mb-4 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3">
      <p className="text-sm font-medium text-accent mb-1">Gate check-in waiting</p>
      <p className="text-xs text-muted leading-relaxed mb-3">
        An organizer scanned your ticket. Open your ticket pass on this phone and confirm with World ID.
      </p>
      <Link
        href={ticketDetailUrl(tokenId, serial)}
        className="inline-flex text-sm font-medium text-accent hover:text-accent-dim"
      >
        Open ticket pass →
      </Link>
    </div>
  );
}
