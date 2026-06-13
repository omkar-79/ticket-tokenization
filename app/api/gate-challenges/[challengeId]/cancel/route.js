import { NextResponse } from "next/server";
import { cancelGateChallenge, getGateChallenge } from "../../../../../src/db/gateChallenges.js";
import { getAccountIdFromRequest, requireUser } from "../../../../../src/lib/auth.js";

export async function POST(request, { params }) {
  try {
    const { challengeId } = await params;
    const accountId = getAccountIdFromRequest(request);
    requireUser(accountId);

    const existing = getGateChallenge(challengeId);
    if (!existing) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    cancelGateChallenge(challengeId, accountId);

    return NextResponse.json({
      success: true,
      challengeId,
      status: "cancelled",
      message: "Verification cancelled — you can scan again",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to cancel verification";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
