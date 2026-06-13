import { NextResponse } from "next/server";
import { listBidsByBidder } from "../../../../src/db/listings.js";
import { getAccountIdFromRequest, requireUser } from "../../../../src/lib/auth.js";
import { checkSecondaryCap, getSecondaryCap } from "../../../../src/lib/secondaryCap.js";

export async function GET(request) {
  try {
    const accountId = getAccountIdFromRequest(request);
    const user = requireUser(accountId);
    const cap = getSecondaryCap();
    const bids = listBidsByBidder(accountId).map((bid) => {
      const capCheck = checkSecondaryCap(user.nullifier_hash, bid.tokenId);
      return {
        ...bid,
        confirmBlocked:
          bid.status === "accepted" && !capCheck.ok ? capCheck.message : null,
      };
    });
    return NextResponse.json({ bids, secondaryCapPerEvent: cap });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load bids";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
