"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../lib/api.js";
import { useAccount } from "./useAccount.js";

const POLL_MS = Number(process.env.NEXT_PUBLIC_LISTING_POLL_MS ?? 15000);

export function useWallet() {
  const { accountId } = useAccount();
  const [wallet, setWallet] = useState(null);
  const [sellerListings, setSellerListings] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [formerTickets, setFormerTickets] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!accountId) {
      setWallet(null);
      setSellerListings([]);
      setSalesHistory([]);
      setFormerTickets([]);
      setMyBids([]);
      setLoading(false);
      return;
    }
    try {
      const [walletData, listingsData, bidsData] = await Promise.all([
        apiGet(`/api/wallet/${accountId}`),
        apiGet("/api/listings/mine", accountId).catch(() => ({ listings: [] })),
        apiGet("/api/bids/mine", accountId).catch(() => ({ bids: [] })),
      ]);
      setWallet(walletData);
      setSellerListings(listingsData.listings ?? []);
      setSalesHistory(listingsData.salesHistory ?? []);
      setFormerTickets(walletData.formerTickets ?? []);
      setMyBids(bidsData.bids ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    refresh();
    if (!accountId) return;
    const timer = setInterval(() => refresh().catch(() => {}), POLL_MS);
    return () => clearInterval(timer);
  }, [accountId, refresh]);

  return { wallet, sellerListings, salesHistory, formerTickets, myBids, loading, error, refresh, accountId };
}
