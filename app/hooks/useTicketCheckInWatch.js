"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const GATE_POLL_MS = Number(process.env.NEXT_PUBLIC_GATE_POLL_MS ?? 2500);

async function fetchTicketStatus(tokenId, serial) {
  const res = await fetch(`/api/tickets/${encodeURIComponent(tokenId)}/${serial}`, {
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to load ticket");
  return data;
}

/** Poll a single ticket pass until gate check-in is detected. */
export function useTicketCheckInWatch(tokenId, serial, { enabled = true, pollMs = GATE_POLL_MS, onCheckedIn } = {}) {
  const prevStatusRef = useRef(undefined);
  const [celebration, setCelebration] = useState(null);

  const dismissCelebration = useCallback(() => setCelebration(null), []);

  useEffect(() => {
    prevStatusRef.current = undefined;
    setCelebration(null);
  }, [tokenId, serial]);

  useEffect(() => {
    if (!enabled || !tokenId || serial == null) return undefined;

    let cancelled = false;

    async function poll() {
      try {
        const data = await fetchTicketStatus(tokenId, serial);
        if (cancelled) return;

        const prev = prevStatusRef.current;
        if (prev !== undefined && prev !== "used" && data.status === "used") {
          setCelebration({
            serial,
            eventName: data.event ?? data.tokenName ?? null,
          });
          onCheckedIn?.(data);
        }

        prevStatusRef.current = data.status;
      } catch {
        /* ignore transient poll errors */
      }
    }

    poll();
    const timer = setInterval(poll, pollMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled, tokenId, serial, pollMs, onCheckedIn]);

  return { celebration, dismissCelebration };
}

/** Poll wallet tickets for any gate check-in while the holder is on My Tickets. */
export function useWalletCheckInWatch(tickets, { enabled = true, pollMs = GATE_POLL_MS, onCheckedIn } = {}) {
  const statusRef = useRef(new Map());
  const [celebration, setCelebration] = useState(null);

  const dismissCelebration = useCallback(() => setCelebration(null), []);

  useEffect(() => {
    for (const ticket of tickets ?? []) {
      const key = `${ticket.tokenId}-${ticket.serial}`;
      if (!statusRef.current.has(key)) {
        statusRef.current.set(key, ticket.status);
      }
    }
  }, [tickets]);

  useEffect(() => {
    if (!enabled) return undefined;

    const active = (tickets ?? []).filter((t) => t.status !== "used");
    if (active.length === 0) return undefined;

    let cancelled = false;

    async function poll() {
      for (const ticket of active) {
        if (cancelled) return;
        const key = `${ticket.tokenId}-${ticket.serial}`;
        try {
          const data = await fetchTicketStatus(ticket.tokenId, ticket.serial);
          if (cancelled) return;

          const prev = statusRef.current.get(key);
          if (prev && prev !== "used" && data.status === "used") {
            statusRef.current.set(key, "used");
            setCelebration({
              serial: ticket.serial,
              eventName: data.event ?? ticket.eventName ?? null,
              tokenId: ticket.tokenId,
            });
            onCheckedIn?.(data, ticket);
            return;
          }
          statusRef.current.set(key, data.status);
        } catch {
          /* ignore */
        }
      }
    }

    poll();
    const timer = setInterval(poll, pollMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled, tickets, pollMs, onCheckedIn]);

  return { celebration, dismissCelebration };
}
