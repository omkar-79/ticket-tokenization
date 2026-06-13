import { NextResponse } from "next/server";
import { getBid, getListing, completeBid } from "../../../../../src/db/listings.js";
import { settleSecondarySale } from "../../../../../src/hedera/settleResale.js";
import { softCheckBidderBalance } from "../../../../../src/hedera/mirror.js";
import { verifyWorldIdProof, extractNullifier } from "../../../../../src/world/verifyProof.js";
import { getAccountIdFromRequest, requireUser } from "../../../../../src/lib/auth.js";
import { checkSecondaryCap } from "../../../../../src/lib/secondaryCap.js";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const accountId = getAccountIdFromRequest(request);
    requireUser(accountId);

    const body = await request.json();
    const { proof } = body;
    if (!proof) {
      return NextResponse.json({ error: "proof is required" }, { status: 400 });
    }

    const bid = getBid(Number(id));
    if (!bid || bid.status !== "accepted") {
      return NextResponse.json({ error: "No accepted bid to confirm" }, { status: 400 });
    }
    if (bid.bidderAccountId !== accountId) {
      return NextResponse.json({ error: "Only the winning bidder can confirm" }, { status: 403 });
    }

    const buyer = requireUser(accountId);
    const listing = getListing(bid.listingId);
    if (!listing || listing.status !== "pending_settlement") {
      return NextResponse.json({ error: "Listing is not awaiting settlement" }, { status: 400 });
    }

    const capCheck = checkSecondaryCap(buyer.nullifier_hash, listing.tokenId);
    if (!capCheck.ok) {
      return NextResponse.json({ error: capCheck.message, capCheck }, { status: 403 });
    }

    const balanceCheck = await softCheckBidderBalance(accountId, bid.bidPriceHbar);
    if (!balanceCheck.ok) {
      return NextResponse.json(
        { error: balanceCheck.warning, balanceCheck },
        { status: 402 }
      );
    }

    const action = process.env.WORLD_ACTION;
    if (!action) {
      return NextResponse.json({ error: "WORLD_ACTION is not configured" }, { status: 500 });
    }

    await verifyWorldIdProof(proof, action);
    const buyerNullifier = extractNullifier(proof);
    if (!buyerNullifier) {
      return NextResponse.json({ error: "Invalid proof" }, { status: 400 });
    }

    const result = await settleSecondarySale({
      tokenId: listing.tokenId,
      serial: listing.serial,
      sellerAccountId: listing.sellerAccountId,
      buyerAccountId: accountId,
      priceHbar: bid.bidPriceHbar,
      buyerNullifier,
    });

    completeBid(bid.id);

    return NextResponse.json({
      success: true,
      ...result,
      bidId: bid.id,
      priceHbar: bid.bidPriceHbar,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to confirm purchase";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
