import { getDb } from "./db.js";
import { assertTokenTransferable, assertTicketResellable } from "../lib/ticketGuards.js";

const LISTING_EXPIRY_HOURS = Number(process.env.LISTING_EXPIRY_HOURS ?? 72);
const BID_EXPIRY_HOURS = Number(process.env.BID_EXPIRY_HOURS ?? 24);

function expiryIso(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export function expireStaleRecords() {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE listings SET status = 'expired'
     WHERE status = 'open' AND expires_at < ?`
  ).run(now);

  db.prepare(
    `UPDATE bids SET status = 'expired', responded_at = ?
     WHERE status = 'pending' AND expires_at < ?`
  ).run(now, now);

  db.prepare(
    `UPDATE listings SET status = 'open'
     WHERE status = 'pending_settlement'
     AND id NOT IN (
       SELECT listing_id FROM bids WHERE status = 'accepted'
     )`
  ).run();
}

function mapListing(row) {
  if (!row) return null;
  return {
    id: row.id,
    tokenId: row.token_id,
    serial: row.serial,
    sellerAccountId: row.seller_account_id,
    askPriceHbar: row.ask_price_hbar,
    minBidHbar: row.min_bid_hbar,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

function mapBid(row) {
  if (!row) return null;
  return {
    id: row.id,
    listingId: row.listing_id,
    bidderAccountId: row.bidder_account_id,
    bidPriceHbar: row.bid_price_hbar,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
  };
}

export function createListing({
  tokenId,
  serial,
  sellerAccountId,
  askPriceHbar,
  minBidHbar = null,
}) {
  expireStaleRecords();
  const db = getDb();
  const expiresAt = expiryIso(LISTING_EXPIRY_HOURS);

  const result = db
    .prepare(
      `INSERT INTO listings (
        token_id, serial, seller_account_id, ask_price_hbar, min_bid_hbar, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(tokenId, serial, sellerAccountId, askPriceHbar, minBidHbar, expiresAt);

  return getListing(result.lastInsertRowid);
}

export function getListing(id) {
  expireStaleRecords();
  const row = getDb().prepare("SELECT * FROM listings WHERE id = ?").get(id);
  return mapListing(row);
}

export function getOpenListingForTicket(tokenId, serial) {
  expireStaleRecords();
  const row = getDb()
    .prepare(
      `SELECT * FROM listings
       WHERE token_id = ? AND serial = ? AND status IN ('open', 'pending_settlement')
       ORDER BY id DESC LIMIT 1`
    )
    .get(tokenId, serial);
  return mapListing(row);
}

export function listOpenListings() {
  expireStaleRecords();
  const rows = getDb()
    .prepare(
      `SELECT l.*, t.name AS token_name, t.symbol AS token_symbol
       FROM listings l
       LEFT JOIN tokens t ON t.token_id = l.token_id
       WHERE l.status = 'open' AND l.expires_at >= datetime('now')
       ORDER BY l.created_at DESC`
    )
    .all();
  return rows.map((row) => ({
    ...mapListing(row),
    tokenName: row.token_name,
    tokenSymbol: row.token_symbol,
    bidCount: countPendingBids(row.id),
    highestBidHbar: getHighestPendingBid(row.id),
  }));
}

function mapOpenListingRows(rows) {
  return rows.map((row) => ({
    ...mapListing(row),
    tokenName: row.token_name,
    tokenSymbol: row.token_symbol,
    bidCount: countPendingBids(row.id),
    highestBidHbar: getHighestPendingBid(row.id),
  }));
}

export function listOpenListingsByToken(tokenId) {
  expireStaleRecords();
  const rows = getDb()
    .prepare(
      `SELECT l.*, t.name AS token_name, t.symbol AS token_symbol
       FROM listings l
       LEFT JOIN tokens t ON t.token_id = l.token_id
       WHERE l.token_id = ? AND l.status = 'open' AND l.expires_at >= datetime('now')
       ORDER BY l.created_at DESC`
    )
    .all(tokenId);
  return mapOpenListingRows(rows);
}

export function countOpenListingsByToken(tokenId) {
  expireStaleRecords();
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS c FROM listings
       WHERE token_id = ? AND status = 'open' AND expires_at >= datetime('now')`
    )
    .get(tokenId);
  return row?.c ?? 0;
}

export function listListingsBySeller(sellerAccountId) {
  expireStaleRecords();
  const rows = getDb()
    .prepare(
      `SELECT l.*, t.name AS token_name, t.symbol AS token_symbol
       FROM listings l
       LEFT JOIN tokens t ON t.token_id = l.token_id
       WHERE l.seller_account_id = ?
       ORDER BY l.created_at DESC`
    )
    .all(sellerAccountId);
  return rows.map((row) => ({
    ...mapListing(row),
    eventName: row.token_name ?? null,
    eventSymbol: row.token_symbol ?? null,
    bidCount: countPendingBids(row.id),
    highestBidHbar: getHighestPendingBid(row.id),
  }));
}

export function listSellerSalesHistory(sellerAccountId) {
  expireStaleRecords();
  const rows = getDb()
    .prepare(
      `SELECT l.*, t.name AS token_name, t.symbol AS token_symbol
       FROM listings l
       LEFT JOIN tokens t ON t.token_id = l.token_id
       WHERE l.seller_account_id = ? AND l.status = 'sold'
       ORDER BY l.created_at DESC`
    )
    .all(sellerAccountId);

  return rows.map((row) => {
    const bids = listBidsForListing(row.id);
    const winningBid =
      bids.find((b) => b.status === "completed") ??
      bids.find((b) => b.status === "accepted");
    return {
      ...mapListing(row),
      eventName: row.token_name ?? null,
      eventSymbol: row.token_symbol ?? null,
      bids,
      winningBid: winningBid ?? null,
      salePriceHbar: winningBid?.bidPriceHbar ?? row.ask_price_hbar,
      buyerAccountId: winningBid?.bidderAccountId ?? null,
    };
  });
}

export function updateListingStatus(id, status) {
  getDb().prepare("UPDATE listings SET status = ? WHERE id = ?").run(status, id);
  return getListing(id);
}

export function cancelListing(id, sellerAccountId) {
  const listing = getListing(id);
  if (!listing) return null;
  if (listing.sellerAccountId !== sellerAccountId) {
    throw new Error("Not listing owner");
  }
  if (!["open", "pending_settlement"].includes(listing.status)) {
    throw new Error("Listing cannot be cancelled");
  }
  const db = getDb();
  db.prepare(
    `UPDATE bids SET status = 'cancelled', responded_at = datetime('now')
     WHERE listing_id = ? AND status IN ('pending', 'accepted')`
  ).run(id);
  return updateListingStatus(id, "cancelled");
}

export function createBid({ listingId, bidderAccountId, bidPriceHbar }) {
  expireStaleRecords();
  const listing = getListing(listingId);
  if (!listing || listing.status !== "open") {
    throw new Error("Listing is not open for bids");
  }
  assertTokenTransferable(listing.tokenId);
  assertTicketResellable(listing.tokenId, listing.serial);
  if (listing.sellerAccountId === bidderAccountId) {
    throw new Error("Cannot bid on your own listing");
  }
  if (listing.minBidHbar != null && bidPriceHbar < listing.minBidHbar) {
    throw new Error(`Bid must be at least ${listing.minBidHbar} HBAR`);
  }

  const expiresAt = expiryIso(BID_EXPIRY_HOURS);
  const result = getDb()
    .prepare(
      `INSERT INTO bids (listing_id, bidder_account_id, bid_price_hbar, expires_at)
       VALUES (?, ?, ?, ?)`
    )
    .run(listingId, bidderAccountId, bidPriceHbar, expiresAt);

  return getBid(result.lastInsertRowid);
}

export function getBid(id) {
  expireStaleRecords();
  const row = getDb().prepare("SELECT * FROM bids WHERE id = ?").get(id);
  return mapBid(row);
}

export function listBidsForListing(listingId) {
  expireStaleRecords();
  const rows = getDb()
    .prepare(
      `SELECT * FROM bids WHERE listing_id = ?
       ORDER BY bid_price_hbar DESC, created_at ASC`
    )
    .all(listingId);
  return rows.map(mapBid);
}

export function listBidsByBidder(bidderAccountId) {
  expireStaleRecords();
  const rows = getDb()
    .prepare(
      `SELECT b.*, l.token_id, l.serial, l.ask_price_hbar, l.seller_account_id, l.status AS listing_status
       FROM bids b
       JOIN listings l ON l.id = b.listing_id
       WHERE b.bidder_account_id = ?
       ORDER BY b.created_at DESC`
    )
    .all(bidderAccountId);
  return rows.map((row) => ({
    ...mapBid(row),
    tokenId: row.token_id,
    serial: row.serial,
    askPriceHbar: row.ask_price_hbar,
    sellerAccountId: row.seller_account_id,
    listingStatus: row.listing_status,
  }));
}

export function countPendingBids(listingId) {
  const row = getDb()
    .prepare(
      "SELECT COUNT(*) AS c FROM bids WHERE listing_id = ? AND status = 'pending'"
    )
    .get(listingId);
  return row?.c ?? 0;
}

export function getHighestPendingBid(listingId) {
  const row = getDb()
    .prepare(
      `SELECT MAX(bid_price_hbar) AS max FROM bids
       WHERE listing_id = ? AND status = 'pending'`
    )
    .get(listingId);
  return row?.max ?? null;
}

export function rejectOtherPendingBids(listingId, exceptBidId) {
  getDb()
    .prepare(
      `UPDATE bids SET status = 'rejected', responded_at = datetime('now')
       WHERE listing_id = ? AND status = 'pending' AND id != ?`
    )
    .run(listingId, exceptBidId);
}

export function acceptBid(bidId, sellerAccountId) {
  expireStaleRecords();
  const bid = getBid(bidId);
  if (!bid || bid.status !== "pending") {
    throw new Error("Bid is not pending");
  }
  const listing = getListing(bid.listingId);
  if (!listing || listing.sellerAccountId !== sellerAccountId) {
    throw new Error("Not listing owner");
  }
  if (listing.status !== "open") {
    throw new Error("Listing is not open");
  }

  const db = getDb();
  db.prepare(
    `UPDATE bids SET status = 'accepted', responded_at = datetime('now') WHERE id = ?`
  ).run(bidId);
  rejectOtherPendingBids(bid.listingId, bidId);
  updateListingStatus(bid.listingId, "pending_settlement");
  return getBid(bidId);
}

export function declineBid(bidId, sellerAccountId) {
  const bid = getBid(bidId);
  if (!bid || bid.status !== "pending") {
    throw new Error("Bid is not pending");
  }
  const listing = getListing(bid.listingId);
  if (!listing || listing.sellerAccountId !== sellerAccountId) {
    throw new Error("Not listing owner");
  }
  getDb()
    .prepare(
      `UPDATE bids SET status = 'rejected', responded_at = datetime('now') WHERE id = ?`
    )
    .run(bidId);
  return getBid(bidId);
}

export function completeBid(bidId) {
  getDb()
    .prepare(
      `UPDATE bids SET status = 'completed', responded_at = datetime('now') WHERE id = ?`
    )
    .run(bidId);
  const bid = getBid(bidId);
  if (bid) {
    updateListingStatus(bid.listingId, "sold");
  }
  return bid;
}

export function getAcceptedBidForListing(listingId) {
  const row = getDb()
    .prepare(
      `SELECT * FROM bids WHERE listing_id = ? AND status = 'accepted' LIMIT 1`
    )
    .get(listingId);
  return mapBid(row);
}

export function countNotifications(accountId) {
  expireStaleRecords();
  const accepted = getDb()
    .prepare(
      `SELECT COUNT(*) AS c FROM bids b
       JOIN listings l ON l.id = b.listing_id
       WHERE b.bidder_account_id = ? AND b.status = 'accepted'`
    )
    .get(accountId)?.c ?? 0;

  const pendingOnListings = getDb()
    .prepare(
      `SELECT COUNT(*) AS c FROM bids b
       JOIN listings l ON l.id = b.listing_id
       WHERE l.seller_account_id = ? AND b.status = 'pending' AND l.status = 'open'`
    )
    .get(accountId)?.c ?? 0;

  return { acceptedBidsToConfirm: accepted, pendingBidsOnYourListings: pendingOnListings };
}

export { LISTING_EXPIRY_HOURS, BID_EXPIRY_HOURS };
