"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../lib/api.js";
import { useAccount } from "./useAccount.js";

export function useOrganizerTokens() {
  const { accountId, isOrganizer } = useAccount();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!accountId || !isOrganizer) {
      setTokens([]);
      setLoading(false);
      return;
    }
    try {
      const data = await apiGet("/api/tokens", accountId);
      setTokens(data.tokens ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [accountId, isOrganizer]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { tokens, loading, error, refresh };
}

export function useEventTickets(tokenId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!tokenId) return;
    try {
      const res = await apiGet(`/api/tokens/${encodeURIComponent(tokenId)}/tickets`);
      setData(res);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [tokenId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    event: data?.token,
    tickets: data?.tickets ?? [],
    royaltySummary: data?.royaltySummary,
    loading,
    error,
    refresh,
  };
}
