"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import PageHeader from "../components/layout/PageHeader.jsx";
import PageTransition from "../components/layout/PageTransition.jsx";
import WorldIdTrigger from "../components/world-id/WorldIdTrigger.jsx";
import Card from "../components/ui/Card.jsx";
import Alert from "../components/ui/Alert.jsx";
import { setStoredAccountId } from "../lib/storage.js";
import { getPostAuthPath } from "../lib/routes.js";
import { fadeUp, fadeUpTransition } from "../lib/motion.js";
import { useClientConfig } from "../hooks/useClientConfig.js";
import { CardSkeleton } from "../components/ui/Skeleton.jsx";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading: configLoading, worldIdReady } = useClientConfig();
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const next = searchParams.get("next");

  useEffect(() => {
    if (!result?.accountId) return;
    setStoredAccountId(result.accountId);
    const path = getPostAuthPath(result.role, next);
    const timer = setTimeout(() => router.push(path), 1200);
    return () => clearTimeout(timer);
  }, [result, next, router]);

  async function handleVerify(proof) {
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proof }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Login failed");
    setResult(data);
    setStoredAccountId(data.accountId);
    return data;
  }

  if (configLoading) {
    return (
      <PageTransition>
        <CardSkeleton />
      </PageTransition>
    );
  }

  if (!worldIdReady) {
    return (
      <PageTransition>
        <PageHeader
          title="Configuration required"
          description="Set WORLD_APP_ID and WORLD_ACTION (or NEXT_PUBLIC_WORLD_APP_ID and NEXT_PUBLIC_WORLD_ACTION) in Cloud Run environment variables."
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-md mx-auto text-center">
        <PageHeader
          title="Log in"
          description="Verify with World ID to restore your existing ticket wallet."
        />

        <p className="text-sm text-muted mb-8">
          New here?{" "}
          <Link href={`/onboard${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-accent">
            Create an account
          </Link>
        </p>

        {!result && (
          <WorldIdTrigger
            label="Verify & Log in"
            onVerify={handleVerify}
            onSuccess={setResult}
            onError={setError}
          />
        )}

        {error && (
          <div className="mt-6">
            <Alert shakeKey={error}>{error}</Alert>
          </div>
        )}

        {result?.accountId && (
          <motion.div {...fadeUp} transition={fadeUpTransition} className="mt-8">
            <Card variant="success" className="text-left space-y-2">
              <p className="text-success text-sm">Signed in</p>
              <p className="font-mono text-sm">{result.accountId}</p>
              <p className="text-muted text-sm capitalize">{result.role}</p>
              <p className="text-xs text-muted pt-2">Redirecting…</p>
              {result.hashscanUrl && (
                <a href={result.hashscanUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent">
                  View on HashScan
                </a>
              )}
            </Card>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}
