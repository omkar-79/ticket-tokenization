"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api.js";
import { useAccount } from "./useAccount.js";

const POLL_MS = Number(process.env.NEXT_PUBLIC_BALANCE_POLL_MS ?? 20000);

export function useHbarBalance() {
  const { accountId, isOrganizer } = useAccount();
  const [balanceHbar, setBalanceHbar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reloadLoading, setReloadLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!accountId || isOrganizer) {
      setBalanceHbar(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiGet(`/api/wallet/${accountId}`);
      setBalanceHbar(data.balanceHbar ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load balance");
    } finally {
      setLoading(false);
    }
  }, [accountId, isOrganizer]);

  const reload = useCallback(
    async (amountHbar) => {
      if (!accountId) throw new Error("Not signed in");
      const amount = Number(amountHbar);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Enter a valid HBAR amount");
      }
      setReloadLoading(true);
      setError(null);
      try {
        const data = await apiPost(`/api/wallet/reload`, { amountHbar: amount }, accountId);
        setBalanceHbar(data.balanceHbar ?? null);
        return data;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Reload failed";
        setError(message);
        throw e;
      } finally {
        setReloadLoading(false);
      }
    },
    [accountId]
  );

  useEffect(() => {
    refresh();
    if (!accountId || isOrganizer) return;
    const timer = setInterval(() => refresh().catch(() => {}), POLL_MS);
    return () => clearInterval(timer);
  }, [accountId, isOrganizer, refresh]);

  return {
    balanceHbar,
    loading,
    reloadLoading,
    error,
    refresh,
    reload,
    enabled: !!accountId && !isOrganizer,
  };
}
