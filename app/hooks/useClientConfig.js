"use client";

import { useEffect, useState } from "react";

let cached = null;
let inflight = null;

async function loadClientConfig() {
  if (cached) return cached;
  if (!inflight) {
    inflight = fetch("/api/client-config", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load config");
        cached = data;
        return data;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function useClientConfig() {
  const [config, setConfig] = useState(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    loadClientConfig()
      .then((data) => {
        if (active) setConfig(data);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load config");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const worldIdReady = Boolean(config?.worldAppId && config?.worldAction);

  return { config, loading, error, worldIdReady };
}
