import { NextResponse } from "next/server";
import { signRequest } from "@worldcoin/idkit/signing";

export async function GET() {
  const signingKey = process.env.WORLD_RP_SIGNING_KEY;
  const rpId = process.env.WORLD_RP_ID;
  const action = process.env.WORLD_ACTION;

  if (!signingKey || !rpId || !action) {
    return NextResponse.json(
      { error: "WORLD_RP_ID, WORLD_RP_SIGNING_KEY, and WORLD_ACTION must be set" },
      { status: 500 }
    );
  }

  const sig = signRequest({ signingKeyHex: signingKey, action });

  return NextResponse.json({
    rp_id: rpId,
    nonce: sig.nonce,
    created_at: sig.createdAt,
    expires_at: sig.expiresAt,
    signature: sig.sig,
  });
}
