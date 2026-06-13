import { NextResponse } from "next/server";
import { getGateChallenge } from "../../../../src/db/gateChallenges.js";
import { getAccountIdFromRequest, requireUser } from "../../../../src/lib/auth.js";

export async function GET(request, { params }) {
  try {
    const { challengeId } = await params;
    const accountId = getAccountIdFromRequest(request);
    requireUser(accountId);

    const challenge = getGateChallenge(challengeId);
    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    const isOrganizer = challenge.organizerAccountId === accountId;
    const isOwner = challenge.ownerAccountId === accountId;
    if (!isOrganizer && !isOwner) {
      return NextResponse.json({ error: "Not authorized for this challenge" }, { status: 403 });
    }

    return NextResponse.json({
      challengeId: challenge.id,
      tokenId: challenge.tokenId,
      serial: challenge.serial,
      status: challenge.status,
      expiresAt: challenge.expiresAt,
      confirmedAt: challenge.confirmedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load challenge";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
