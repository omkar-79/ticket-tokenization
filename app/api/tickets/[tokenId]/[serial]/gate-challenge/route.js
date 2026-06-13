import { NextResponse } from "next/server";
import { getPendingChallengeForTicket } from "../../../../../../src/db/gateChallenges.js";
import { getCurrentOwner } from "../../../../../../src/db/tickets.js";
import { getAccountIdFromRequest, requireUser } from "../../../../../../src/lib/auth.js";

export async function GET(request, { params }) {
  try {
    const { tokenId, serial: serialStr } = await params;
    const serial = Number(serialStr);
    const accountId = getAccountIdFromRequest(request);
    requireUser(accountId);

    const owner = getCurrentOwner(tokenId, serial);
    if (!owner || owner.owner_account_id !== accountId) {
      return NextResponse.json({ pending: false });
    }

    const challenge = getPendingChallengeForTicket(tokenId, serial, accountId);
    if (!challenge) {
      return NextResponse.json({ pending: false });
    }

    return NextResponse.json({
      pending: true,
      challengeId: challenge.id,
      expiresAt: challenge.expiresAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to check gate challenge";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
