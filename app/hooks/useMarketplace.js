"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../lib/api.js";
import { AUTH_EVENT } from "../lib/storage.js";

const POLL_MS = Number(process.env.NEXT_PUBLIC_LISTING_POLL_MS ?? 10000);

export function useMarketplace() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const data = await apiGet(`/api/marketplace?_=${Date.now()}`);
      setCollections(data.collections ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onRefresh = () => refresh().catch(() => {});
    const timer = setInterval(onRefresh, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") onRefresh();
    };
    window.addEventListener("focus", onRefresh);
    window.addEventListener("visibilitychange", onVisible);
    window.addEventListener(AUTH_EVENT, onRefresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(AUTH_EVENT, onRefresh);
    };
  }, [refresh]);

  return { collections, loading, error, refresh };
}

export function useCollection(tokenId) {
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!tokenId) return;
    try {
      const data = await apiGet(
        `/api/marketplace?tokenId=${encodeURIComponent(tokenId)}`
      );
      setCollection(data.collection ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load collection");
    } finally {
      setLoading(false);
    }
  }, [tokenId]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  return { collection, loading, error, refresh };
}
