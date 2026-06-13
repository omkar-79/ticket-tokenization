"use client";

import { useCallback, useState } from "react";
import { useToast } from "../components/ui/ToastHost.jsx";

export function useApiMutation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const mutate = useCallback(
    async (fn, { successMessage, errorShake = true } = {}) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fn();
        if (successMessage) toast(successMessage, "success");
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong";
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  return { mutate, loading, error, setError, clearError: () => setError(null) };
}
