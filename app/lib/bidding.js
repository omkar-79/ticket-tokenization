/** Suggested bid below ask — respects seller min bid and current high bid. */
export function suggestedUnderAskBid(listing) {
  const ask = Number(listing.askPriceHbar);
  const min = listing.minBidHbar != null ? Number(listing.minBidHbar) : 1;
  if (!Number.isFinite(ask) || ask <= 1) return null;

  let candidate;
  if (listing.highestBidHbar != null && listing.highestBidHbar < ask) {
    candidate = listing.highestBidHbar + 1;
  } else {
    candidate = Math.max(min, Math.floor(ask * 0.9));
  }

  candidate = Math.max(candidate, min);
  if (candidate >= ask) {
    candidate = ask - 1;
  }

  return candidate >= min && candidate < ask ? candidate : null;
}

export function isBuyNowAmount(listing, amount) {
  const bid = Number(amount);
  return Number.isFinite(bid) && bid >= Number(listing.askPriceHbar);
}

export function validateBidAmount(listing, amount) {
  const bid = Number(amount);
  if (!Number.isFinite(bid) || bid <= 0) {
    return "Enter a valid bid amount";
  }
  if (listing.minBidHbar != null && bid < listing.minBidHbar) {
    return `Bid must be at least ${listing.minBidHbar} HBAR`;
  }
  return null;
}
