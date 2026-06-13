export function getPostAuthPath(role, next) {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  if (role === "organizer") return "/events";
  return "/";
}

export function walletTabUrl(tab, bidId) {
  const params = new URLSearchParams({ tab });
  if (bidId) params.set("bid", String(bidId));
  return `/wallet?${params.toString()}`;
}

/** @deprecated use walletTabUrl("bids", bidId) */
export function walletActionsUrl(bidId) {
  return walletTabUrl("bids", bidId);
}

export function ticketDetailUrl(tokenId, serial) {
  return `/tickets/${encodeURIComponent(tokenId)}/${serial}`;
}

export function marketplaceCollectionUrl(tokenId) {
  return `/collections/${encodeURIComponent(tokenId)}`;
}

export function eventDetailUrl(tokenId) {
  return `/events/${encodeURIComponent(tokenId)}`;
}

export function hashscanTxUrl(txId) {
  return `https://hashscan.io/testnet/transaction/${txId}`;
}

export function hashscanAccountUrl(accountId) {
  return `https://hashscan.io/testnet/account/${accountId}`;
}

export function hashscanTokenUrl(tokenId) {
  return `https://hashscan.io/testnet/token/${tokenId}`;
}
