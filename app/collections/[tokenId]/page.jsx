"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "../../components/layout/PageHeader.jsx";
import PageTransition from "../../components/layout/PageTransition.jsx";
import CollectionCard from "../../components/tickets/CollectionCard.jsx";
import BrowseResalePanel from "../../components/tickets/BrowseResalePanel.jsx";
import Alert from "../../components/ui/Alert.jsx";
import { CardSkeleton } from "../../components/ui/Skeleton.jsx";
import { useAccount } from "../../hooks/useAccount.js";
import { useCollection } from "../../hooks/useMarketplace.js";
import { useApiMutation } from "../../hooks/useApi.js";
import { apiPost } from "../../lib/api.js";
import { hashscanTokenUrl } from "../../lib/routes.js";
import { formatAccountDisplay } from "../../lib/accountDisplay.js";

export default function CollectionPage({ params }) {
  const router = useRouter();
  const { accountId, isOrganizer, loading: accountLoading } = useAccount();
  const [tokenId, setTokenId] = useState(null);
  const { collection, loading, error, refresh } = useCollection(tokenId);
  const { mutate, error: buyError } = useApiMutation();
  const [buyLoading, setBuyLoading] = useState(false);
  const [purchasingQuantity, setPurchasingQuantity] = useState(1);
  const [buySuccess, setBuySuccess] = useState(null);
  const [authPromptId, setAuthPromptId] = useState(null);

  useEffect(() => {
    params.then((p) => setTokenId(p.tokenId));
  }, [params]);

  useEffect(() => {
    if (!accountLoading && isOrganizer) {
      router.replace("/events");
    }
  }, [accountLoading, isOrganizer, router]);

  async function buyTicket(quantity = 1) {
    if (!collection) return;
    if (!accountId) {
      setAuthPromptId(collection.tokenId);
      return;
    }
    setAuthPromptId(null);
    setBuySuccess(null);
    setPurchasingQuantity(quantity);
    setBuyLoading(true);
    try {
      const data = await mutate(
        () =>
          apiPost(`/api/tokens/${collection.tokenId}/buy`, {
            buyerAccountId: accountId,
            quantity,
          }),
        {
          successMessage:
            quantity > 1 ? `${quantity} tickets purchased` : "Ticket purchased",
        }
      );
      setBuySuccess({ ...data, tokenId: collection.tokenId });
      await refresh();
    } catch {
      /* error in hook */
    } finally {
      setBuyLoading(false);
      setPurchasingQuantity(1);
    }
  }

  if (accountLoading || isOrganizer) {
    return (
      <PageTransition>
        <CardSkeleton />
      </PageTransition>
    );
  }

  if (loading || !collection) {
    return (
      <PageTransition>
        <CardSkeleton />
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <Alert shakeKey={error}>{error}</Alert>
        <Link href="/" className="text-accent text-sm mt-4 inline-block">Back to marketplace</Link>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <p className="text-xs text-muted mb-4">
        <Link href="/" className="hover:text-accent transition-colors">Marketplace</Link>
        <span className="mx-2">/</span>
        <span className="text-text">{collection.name}</span>
      </p>

      <PageHeader
        title={collection.name}
        description={
          <>
            <span className="font-mono text-xs">
              {formatAccountDisplay(collection.organizerAccountId, collection.organizerEnsName)}
            </span>
            {" · "}
            {collection.faceValueHbar} HBAR face value
            {" · "}
            <a
              href={hashscanTokenUrl(collection.tokenId)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-dim"
            >
              HashScan
            </a>
          </>
        }
      />

      {(buyError) && (
        <div className="mb-6">
          <Alert shakeKey={buyError}>{buyError}</Alert>
        </div>
      )}

      <section className="mb-10">
        <h2 className="text-sm uppercase tracking-widest text-muted mb-4">Primary sale</h2>
        {collection.paused && (
          <p className="text-sm text-pending mb-4 border border-pending/30 rounded-lg px-4 py-3">
            This event is paused. Primary sales and resale are disabled until the organizer resumes the match.
          </p>
        )}
        <ul className="space-y-4">
          <CollectionCard
            item={collection}
            accountId={accountId}
            loading={buyLoading}
            purchasingQuantity={buyLoading ? purchasingQuantity : 1}
            onBuy={buyTicket}
            buySuccess={buySuccess}
            authPromptId={authPromptId}
            embedded
          />
        </ul>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-widest text-muted mb-4">Fan resale</h2>
        {collection.paused ? (
          <p className="text-sm text-muted border border-dashed border-border rounded-lg px-4 py-8 text-center">
            Resale listings are unavailable while this event is paused.
          </p>
        ) : (
          <BrowseResalePanel
            accountId={accountId}
            tokenId={collection.tokenId}
            collectionName={collection.name}
          />
        )}
      </section>
    </PageTransition>
  );
}
