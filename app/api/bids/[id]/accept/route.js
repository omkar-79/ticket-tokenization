import { NextResponse } from "next/server";
import { acceptBid, getBid, getListing } from "../../../../../src/db/listings.js";
import { softCheckBidderBalance } from "../../../../../src/hedera/mirror.js";
import { getAccountIdFromRequest, requireUser } from "../../../../../src/lib/auth.js";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const accountId = getAccountIdFromRequest(request);
    requireUser(accountId);

    const bid = getBid(Number(id));
    if (!bid) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 });
    }

    const listing = getListing(bid.listingId);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const balanceCheck = await softCheckBidderBalance(bid.bidderAccountId, bid.bidPriceHbar);
    if (!balanceCheck.ok) {
      return NextResponse.json(
        { error: balanceCheck.warning, balanceCheck },
        { status: 402 }
      );
    }

    const accepted = acceptBid(Number(id), accountId);

    return NextResponse.json({
      success: true,
      bid: accepted,
      balanceWarning: balanceCheck.warning ?? null,
      message: "Bid accepted. Buyer must confirm with World ID in My Tickets.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to accept bid";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
