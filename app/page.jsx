"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import PageHeader from "./components/layout/PageHeader.jsx";
import PageTransition from "./components/layout/PageTransition.jsx";
import CollectionCard from "./components/tickets/CollectionCard.jsx";
import Alert from "./components/ui/Alert.jsx";
import { CardSkeleton } from "./components/ui/Skeleton.jsx";
import { useAccount } from "./hooks/useAccount.js";
import { useMarketplace } from "./hooks/useMarketplace.js";
import { useApiMutation } from "./hooks/useApi.js";
import { apiPost } from "./lib/api.js";
import { staggerContainer } from "./lib/motion.js";
import { useMotionSafe } from "./lib/motion.js";

export default function MarketplacePage() {
  const router = useRouter();
  const { accountId, isOrganizer, loading: accountLoading } = useAccount();
  const { collections, loading, error, refresh } = useMarketplace();
  const { mutate, error: buyError } = useApiMutation();
  const [buyLoading, setBuyLoading] = useState(null);
  const [buySuccess, setBuySuccess] = useState(null);
  const [authPromptId, setAuthPromptId] = useState(null);
  const { stagger } = useMotionSafe();

  useEffect(() => {
    if (!accountLoading && isOrganizer) {
      router.replace("/events");
    }
  }, [accountLoading, isOrganizer, router]);

  if (accountLoading || isOrganizer) {
    return (
      <PageTransition>
        <CardSkeleton />
      </PageTransition>
    );
  }

  async function buyTicket(tokenId) {
    if (!accountId) {
      setAuthPromptId(tokenId);
      return;
    }
    setAuthPromptId(null);
    setBuySuccess(null);
    setBuyLoading(tokenId);
    try {
      const data = await mutate(
        () => apiPost(`/api/tokens/${tokenId}/buy`, { buyerAccountId: accountId }),
        { successMessage: "Ticket purchased" }
      );
      setBuySuccess({ ...data, tokenId });
      await refresh();
    } catch {
      /* error in hook */
    } finally {
      setBuyLoading(null);
    }
  }

  return (
    <PageTransition>
      <PageHeader
        title="Ticket Marketplace"
        description="Buy at face value or bid on fan resales."
      />

      {(error || buyError) && (
        <div className="mb-6">
          <Alert shakeKey={buyError}>{error || buyError}</Alert>
        </div>
      )}

      {!accountId && (
        <p className="text-sm text-muted mb-8">
          <Link href="/login" className="text-accent">Log in</Link>
          {" or "}
          <Link href="/onboard" className="text-accent">create an account</Link>
          {" to purchase."}
        </p>
      )}

      {loading ? (
        <ul className="space-y-4">
          {[1, 2].map((i) => (
            <li key={i}><CardSkeleton /></li>
          ))}
        </ul>
      ) : collections.length === 0 ? (
        <p className="text-muted text-sm">
          No collections yet.{" "}
          <Link href="/events" className="text-accent">Organizers can create one</Link>
        </p>
      ) : (
        <motion.ul
          variants={stagger}
          initial="initial"
          animate="animate"
          className="space-y-4"
        >
          {collections.map((item) => (
            <CollectionCard
              key={item.tokenId}
              item={item}
              accountId={accountId}
              loading={loading === item.tokenId}
              onBuy={buyTicket}
              buySuccess={buySuccess}
              authPromptId={authPromptId}
            />
          ))}
        </motion.ul>
      )}
    </PageTransition>
  );
}
