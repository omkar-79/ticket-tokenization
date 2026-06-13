"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../lib/api.js";

const POLL_MS = Number(process.env.NEXT_PUBLIC_LISTING_POLL_MS ?? 15000);

export function useListings(tokenId = null) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const path = tokenId
        ? `/api/listings?tokenId=${encodeURIComponent(tokenId)}`
        : "/api/listings";
      const data = await apiGet(path);
      setListings(data.listings ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [tokenId]);

  useEffect(() => {
    setLoading(true);
    refresh();
    const timer = setInterval(() => refresh().catch(() => {}), POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  return { listings, loading, error, refresh };
}
