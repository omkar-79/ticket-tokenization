"use client";

import { useCallback, useEffect, useState } from "react";
import { AUTH_EVENT, getStoredAccountId } from "../lib/storage.js";
import { apiGet } from "../lib/api.js";

export function useAccount() {
  const [accountId, setAccountId] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const id = getStoredAccountId();
    setAccountId(id);
    if (!id) {
      setRole(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiGet(`/api/wallet/${id}`);
      setRole(data.user?.role ?? null);
    } catch {
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(AUTH_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(AUTH_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  return {
    accountId,
    role,
    loading,
    isSignedIn: !!accountId,
    isOrganizer: role === "organizer",
    refresh,
  };
}
