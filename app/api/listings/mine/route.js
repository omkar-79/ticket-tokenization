import { NextResponse } from "next/server";
import {
  listListingsBySeller,
  listBidsForListing,
  listSellerSalesHistory,
} from "../../../../src/db/listings.js";
import { getAccountIdFromRequest, requireUser } from "../../../../src/lib/auth.js";

export async function GET(request) {
  try {
    const accountId = getAccountIdFromRequest(request);
    requireUser(accountId);

    const listings = listListingsBySeller(accountId).map((listing) => ({
      ...listing,
      bids: listBidsForListing(listing.id),
    }));

    const active = listings.filter((l) => ["open", "pending_settlement"].includes(l.status));
    const salesHistory = listSellerSalesHistory(accountId);

    return NextResponse.json({ listings: active, salesHistory, allListings: listings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load seller listings";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
