import { NextResponse } from "next/server";
import { confirmGateChallenge, getGateChallenge } from "../../../../../../../src/db/gateChallenges.js";
import { getCurrentOwner } from "../../../../../../../src/db/tickets.js";
import { scanTicketAtGate } from "../../../../../../../src/hedera/venue.js";
import { verifyWorldIdProof, extractNullifier } from "../../../../../../../src/world/verifyProof.js";
import { getAccountIdFromRequest, requireUser } from "../../../../../../../src/lib/auth.js";

export async function POST(request, { params }) {
  try {
    const { tokenId, serial: serialStr } = await params;
    const serial = Number(serialStr);
    const accountId = getAccountIdFromRequest(request);
    const holder = requireUser(accountId);

    const body = await request.json();
    const { challengeId, proof } = body;
    if (!challengeId) {
      return NextResponse.json({ error: "challengeId is required" }, { status: 400 });
    }
    if (!proof) {
      return NextResponse.json({ error: "World ID proof is required" }, { status: 400 });
    }

    const challenge = getGateChallenge(challengeId);
    if (!challenge) {
      return NextResponse.json({ error: "Gate challenge not found" }, { status: 404 });
    }
    if (challenge.tokenId !== tokenId || challenge.serial !== serial) {
      return NextResponse.json({ error: "Challenge does not match this ticket" }, { status: 400 });
    }
    if (challenge.ownerAccountId !== accountId) {
      return NextResponse.json(
        { error: "Confirm entry only on the ticket pass page while logged in as the holder" },
        { status: 403 }
      );
    }

    const owner = getCurrentOwner(tokenId, serial);
    if (!owner || owner.owner_account_id !== accountId) {
      return NextResponse.json({ error: "You are not the current ticket holder" }, { status: 403 });
    }

    const action = process.env.WORLD_ACTION;
    if (!action) {
      return NextResponse.json({ error: "WORLD_ACTION is not configured" }, { status: 500 });
    }

    await verifyWorldIdProof(proof, action);
    const nullifier = extractNullifier(proof);
    if (!nullifier || nullifier !== holder.nullifier_hash) {
      return NextResponse.json(
        { error: "World ID must match the ticket holder's verified identity" },
        { status: 403 }
      );
    }

    const result = await scanTicketAtGate({ tokenId, serial });
    confirmGateChallenge(challengeId, accountId);

    return NextResponse.json({
      success: true,
      challengeId,
      ...result,
      message: "Entry confirmed — enjoy the event",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gate entry confirmation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
