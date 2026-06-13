import { NextResponse } from "next/server";
import { validateGatePassForScan } from "../../../../../../src/gate/validatePass.js";
import { createGateChallenge } from "../../../../../../src/db/gateChallenges.js";
import { tryParseGatePass } from "../../../../../../src/lib/gatePass.js";
import { getAccountIdFromRequest, requireOrganizerOfToken } from "../../../../../../src/lib/auth.js";

export async function POST(request, { params }) {
  try {
    const { tokenId } = await params;
    const accountId = getAccountIdFromRequest(request);
    requireOrganizerOfToken(accountId, tokenId);

    const body = await request.json();
    let pass = body.pass ?? null;

    if (!pass && body.passJson) {
      pass = tryParseGatePass(body.passJson);
    }
    if (!pass && typeof body.raw === "string") {
      pass = tryParseGatePass(body.raw);
    }

    if (!pass) {
      return NextResponse.json(
        {
          error:
            "Signed ticket pass required. Ask the fan to open their ticket pass QR (old passes no longer work).",
        },
        { status: 400 }
      );
    }

    const validated = await validateGatePassForScan(pass, tokenId);

    const challenge = createGateChallenge({
      tokenId,
      serial: validated.serial,
      ownerAccountId: validated.ownerAccountId,
      organizerAccountId: accountId,
      passGeneration: validated.passGeneration,
    });

    return NextResponse.json({
      success: true,
      challengeId: challenge.id,
      serial: validated.serial,
      ownerAccountId: validated.ownerAccountId,
      status: challenge.status,
      expiresAt: challenge.expiresAt,
      message: "Pass verified — waiting for holder to confirm with World ID on their phone",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gate scan initiation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
