import { NextResponse } from "next/server";
import {
  createBid,
  listBidsForListing,
  getListing,
  acceptBid,
  BID_EXPIRY_HOURS,
} from "../../../../../src/db/listings.js";
import { softCheckBidderBalance } from "../../../../../src/hedera/mirror.js";
import { getAccountIdFromRequest, requireUser } from "../../../../../src/lib/auth.js";

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const listing = getListing(Number(id));
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    return NextResponse.json({
      listing,
      bids: listBidsForListing(Number(id)),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load bids";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const accountId = getAccountIdFromRequest(request);
    requireUser(accountId);

    const body = await request.json();
    const bidPriceHbar = Number(body.bidPriceHbar);
    if (!Number.isFinite(bidPriceHbar) || bidPriceHbar <= 0) {
      return NextResponse.json({ error: "bidPriceHbar must be positive" }, { status: 400 });
    }

    const listing = getListing(Number(id));
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const balanceCheck = await softCheckBidderBalance(accountId, bidPriceHbar);

    const bid = createBid({
      listingId: Number(id),
      bidderAccountId: accountId,
      bidPriceHbar,
    });

    let autoAccepted = false;
    let acceptedBid = null;
    if (bidPriceHbar >= listing.askPriceHbar) {
      if (!balanceCheck.ok) {
        return NextResponse.json(
          { error: balanceCheck.warning, balanceCheck },
          { status: 402 }
        );
      }
      acceptedBid = acceptBid(bid.id, listing.sellerAccountId);
      autoAccepted = true;
    }

    return NextResponse.json({
      success: true,
      bid: autoAccepted ? acceptedBid : bid,
      autoAccepted,
      buyNow: autoAccepted,
      balanceWarning: balanceCheck.ok ? null : balanceCheck.warning,
      bidExpiresInHours: BID_EXPIRY_HOURS,
      message: autoAccepted
        ? "Bid meets ask price — buy now! Confirm purchase in My Tickets."
        : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to place bid";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
