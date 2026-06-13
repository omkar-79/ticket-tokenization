"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../lib/api.js";
import { useAccount } from "./useAccount.js";

const POLL_MS = Number(process.env.NEXT_PUBLIC_LISTING_POLL_MS ?? 15000);

export function useNotifications() {
  const { accountId, isSignedIn } = useAccount();
  const [data, setData] = useState(null);

  const refresh = useCallback(async () => {
    if (!accountId) {
      setData(null);
      return;
    }
    try {
      const res = await apiGet("/api/notifications", accountId);
      setData(res);
    } catch {
      setData(null);
    }
  }, [accountId]);

  useEffect(() => {
    refresh();
    if (!isSignedIn) return;
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh, isSignedIn]);

  const actionCount = data?.acceptedBidsToConfirm ?? 0;
  const bidCount = data?.pendingBidsOnYourListings ?? 0;

  return {
    data,
    actionCount,
    bidCount,
    totalCount: actionCount + bidCount,
    refresh,
  };
}
