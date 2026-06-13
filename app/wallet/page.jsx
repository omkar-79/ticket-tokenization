"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { IDKitRequestWidget, deviceLegacy } from "@worldcoin/idkit";
import PageHeader from "../components/layout/PageHeader.jsx";
import PageTransition, { AuthGate } from "../components/layout/PageTransition.jsx";
import TicketCard from "../components/tickets/TicketCard.jsx";
import ActiveListingCard from "../components/tickets/ActiveListingCard.jsx";
import MyBidsPanel from "../components/tickets/MyBidsPanel.jsx";
import { MarketplaceSaleCard, FormerTicketCard } from "../components/tickets/SaleHistoryCard.jsx";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import SegmentedControl from "../components/ui/SegmentedControl.jsx";
import Alert from "../components/ui/Alert.jsx";
import { CardSkeleton } from "../components/ui/Skeleton.jsx";
import { useWallet } from "../hooks/useWallet.js";
import { useNotifications } from "../hooks/useNotifications.js";
import { useAccount } from "../hooks/useAccount.js";
import { useToast } from "../components/ui/ToastHost.jsx";
import { apiPost, apiDelete } from "../lib/api.js";
import { fetchRpContext, getWorldIdClientConfig } from "../lib/worldId.js";
import { ticketDetailUrl, walletTabUrl } from "../lib/routes.js";
import { fadeUpTransition } from "../lib/motion.js";

const TABS = [
  { id: "tickets", label: "Tickets" },
  { id: "selling", label: "Selling", sellerBadge: true },
  { id: "bids", label: "Bids", buyerBadge: true },
];

export default function WalletPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isOrganizer, loading: accountLoading } = useAccount();
  const { wallet, sellerListings, salesHistory, formerTickets, myBids, loading, error, refresh, accountId } = useWallet();
  const { actionCount, bidCount } = useNotifications();
  const { toast } = useToast();

  const initialTab = normalizeTab(searchParams.get("tab"));
  const highlightBid = searchParams.get("bid");
  const [tab, setTab] = useState(initialTab);
  const [askPrices, setAskPrices] = useState({});
  const [minBids, setMinBids] = useState({});
  const [actionLoading, setActionLoading] = useState(null);
  const [localError, setLocalError] = useState(null);

  const [confirmBidId, setConfirmBidId] = useState(null);
  const [worldIdOpen, setWorldIdOpen] = useState(false);
  const [requestConfig, setRequestConfig] = useState(null);
  const { appId, action, environment } = getWorldIdClientConfig();

  useEffect(() => {
    if (!accountLoading && isOrganizer) {
      router.replace("/events");
    }
  }, [accountLoading, isOrganizer, router]);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "browse") {
      router.replace("/");
      return;
    }
    if (t) setTab(normalizeTab(t));
    if (highlightBid) setTab("bids");
  }, [searchParams, highlightBid, router]);

  const acceptedBids = myBids.filter((b) => b.status === "accepted");
  const pendingBids = myBids.filter((b) => b.status === "pending");

  function ticketHasActiveListing(ticket) {
    return sellerListings.some(
      (l) =>
        l.tokenId === ticket.tokenId &&
        l.serial === ticket.serial &&
        ["open", "pending_settlement"].includes(l.status)
    );
  }

  function selectTab(id) {
    setTab(id);
    router.replace(walletTabUrl(id), { scroll: false });
  }

  async function listForResale(ticket) {
    const key = `${ticket.tokenId}-${ticket.serial}`;
    const ask = Number(askPrices[key] ?? ticket.priceHbar ?? 0);
    const minBid = minBids[key] ? Number(minBids[key]) : undefined;
    if (!Number.isFinite(ask) || ask <= 0) {
      setLocalError("Enter a valid ask price");
      return;
    }
    setActionLoading(`list-${key}`);
    setLocalError(null);
    try {
      await apiPost(
        "/api/listings",
        { tokenId: ticket.tokenId, serial: ticket.serial, askPriceHbar: ask, ...(minBid ? { minBidHbar: minBid } : {}) },
        accountId
      );
      toast("Listed on resale marketplace", "success");
      await refresh();
      selectTab("selling");
    } catch (e) {
      setLocalError(e.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function cancelListing(listingId) {
    setActionLoading(`cancel-${listingId}`);
    try {
      await apiDelete(`/api/listings/${listingId}`, accountId);
      toast("Listing cancelled", "success");
      await refresh();
    } catch (e) {
      setLocalError(e.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function acceptBid(bidId) {
    setActionLoading(`accept-${bidId}`);
    try {
      const data = await apiPost(`/api/bids/${bidId}/accept`, {}, accountId);
      if (data.balanceWarning) toast(data.balanceWarning, "pending");
      else toast("Bid accepted — buyer must confirm", "success");
      await refresh();
    } catch (e) {
      setLocalError(e.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function declineBid(bidId) {
    setActionLoading(`decline-${bidId}`);
    try {
      await apiPost(`/api/bids/${bidId}/decline`, {}, accountId);
      await refresh();
    } catch (e) {
      setLocalError(e.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function startConfirmBid(bidId) {
    const bid = myBids.find((b) => b.id === bidId);
    if (bid?.confirmBlocked) {
      setLocalError(bid.confirmBlocked);
      return;
    }
    setConfirmBidId(bidId);
    setLocalError(null);
    try {
      const rp_context = await fetchRpContext();
      setRequestConfig({
        app_id: appId,
        action,
        rp_context,
        allow_legacy_proofs: true,
        environment,
        preset: deviceLegacy(),
      });
      setWorldIdOpen(true);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Failed to start World ID");
    }
  }

  async function handleVerify(proof) {
    if (!confirmBidId) throw new Error("No bid selected");
    try {
      const data = await apiPost(`/api/bids/${confirmBidId}/confirm`, { proof }, accountId);
      toast(data.royaltyNote ?? "Purchase complete", "success");
      setConfirmBidId(null);
      await refresh();
      return data;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Confirmation failed";
      setLocalError(message);
      setWorldIdOpen(false);
      throw new Error(message);
    }
  }

  if (!accountId && !loading) {
    return (
      <PageTransition>
        <PageHeader title="My Tickets" description="Your NFT tickets and resale activity." />
        <AuthGate />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <PageHeader
        title="My Tickets"
        description="Your tickets, resale listings, and bids."
      />

      {wallet?.user?.ensName && (
        <Card className="mb-6 space-y-1">
          <p className="text-xs uppercase tracking-widest text-muted">Your ENS identity</p>
          <p className="font-mono text-sm text-accent break-all">{wallet.user.ensName}</p>
          <p className="text-xs text-muted">Others can send you tickets using this name.</p>
        </Card>
      )}

      {(error || localError) && (
        <div className="mb-6">
          <Alert shakeKey={localError || error}>{localError || error}</Alert>
        </div>
      )}

      <div className="mb-6">
        <SegmentedControl
          layoutId="wallet-tab"
          value={tab}
          onChange={selectTab}
          items={TABS.map((t) => ({
            id: t.id,
            label: t.label,
            badge: (t.buyerBadge ? actionCount : 0) || (t.sellerBadge ? bidCount : 0),
          }))}
        />
      </div>

      {loading ? (
        <CardSkeleton />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={fadeUpTransition}
          >
            {tab === "tickets" && (
              <TicketsPanel
                tickets={wallet?.tickets}
                sellerListings={sellerListings}
                askPrices={askPrices}
                minBids={minBids}
                onAskChange={(key, v) => setAskPrices({ ...askPrices, [key]: v })}
                onMinBidChange={(key, v) => setMinBids({ ...minBids, [key]: v })}
                onList={listForResale}
                actionLoading={actionLoading}
                ticketHasActiveListing={ticketHasActiveListing}
              />
            )}

            {tab === "selling" && (
              <SellingPanel
                listings={sellerListings}
                salesHistory={salesHistory}
                formerTickets={formerTickets}
                onCancel={cancelListing}
                onAccept={acceptBid}
                onDecline={declineBid}
                actionLoading={actionLoading}
              />
            )}

            {tab === "bids" && (
              <MyBidsPanel
                pendingBids={pendingBids}
                acceptedBids={acceptedBids}
                highlightBid={highlightBid}
                onConfirm={startConfirmBid}
              />
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {requestConfig && confirmBidId && (
        <IDKitRequestWidget
          open={worldIdOpen}
          onOpenChange={setWorldIdOpen}
          {...requestConfig}
          handleVerify={handleVerify}
          onSuccess={() => setWorldIdOpen(false)}
          onError={(code) => {
            if (!localError) {
              setLocalError(
                code === "failed_by_host_app"
                  ? "Purchase confirmation failed. Check your HBAR balance and resale limit, then try again."
                  : `World ID error: ${code}`
              );
            }
          }}
        />
      )}
    </PageTransition>
  );
}

function TicketsPanel({ tickets, askPrices, minBids, onAskChange, onMinBidChange, onList, actionLoading, ticketHasActiveListing }) {
  if (!tickets?.length) {
    return (
      <p className="text-muted text-sm">
        No tickets yet.{" "}
        <Link href="/" className="text-accent">Buy on the marketplace</Link>
        {" or "}
        <Link href="/" className="text-accent">marketplace</Link>
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {tickets.map((t) => {
        const key = `${t.tokenId}-${t.serial}`;
        return (
          <TicketCard
            key={key}
            ticket={t}
            askPrice={askPrices[key]}
            minBid={minBids[key]}
            onAskChange={(v) => onAskChange(key, v)}
            onMinBidChange={(v) => onMinBidChange(key, v)}
            onList={() => onList(t)}
            listLoading={actionLoading === `list-${key}`}
            hasActiveListing={ticketHasActiveListing(t)}
            faceValue={t.priceHbar}
          />
        );
      })}
    </ul>
  );
}

function SellingPanel({
  listings,
  salesHistory,
  formerTickets,
  onCancel,
  onAccept,
  onDecline,
  actionLoading,
}) {
  const offMarketFormer = (formerTickets ?? []).filter(
    (f) =>
      !(salesHistory ?? []).some(
        (s) =>
          s.tokenId === f.tokenId &&
          s.serial === f.serial &&
          s.buyerAccountId === f.soldTo &&
          s.salePriceHbar === f.soldPriceHbar
      )
  );
  const hasActive = listings.length > 0;
  const hasHistory = (salesHistory?.length ?? 0) > 0 || offMarketFormer.length > 0;

  if (!hasActive && !hasHistory) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-lg">
        <p className="text-muted text-sm mb-2">You have no active listings.</p>
        <p className="text-muted text-xs">
          List a ticket from <strong className="text-text">My tickets</strong> to start selling.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {hasActive && (
        <section>
          <h2 className="text-sm uppercase tracking-widest text-muted mb-4">Active listings</h2>
          <ul className="space-y-4">
            {listings.map((l) => (
              <li key={l.id}>
                <ActiveListingCard
                  listing={l}
                  onCancel={onCancel}
                  onAccept={onAccept}
                  onDecline={onDecline}
                  actionLoading={actionLoading}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasHistory && (
        <section>
          <h2 className="text-sm uppercase tracking-widest text-muted mb-4">Sales history</h2>
          <p className="text-xs text-muted mb-4">
            Tickets you previously listed, bids you received, and sales you completed.
          </p>
          <ul className="space-y-4">
            {(salesHistory ?? []).map((sale) => (
              <li key={`sale-${sale.id}`}>
                <MarketplaceSaleCard sale={sale} />
              </li>
            ))}
            {offMarketFormer.map((ticket) => (
              <li key={`former-${ticket.tokenId}-${ticket.serial}-${ticket.heldFrom}`}>
                <FormerTicketCard ticket={ticket} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function normalizeTab(tab) {
  if (tab === "actions" || tab === "buying" || tab === "browse") return tab === "browse" ? "tickets" : "bids";
  if (tab && ["tickets", "selling", "bids"].includes(tab)) return tab;
  return "tickets";
}
