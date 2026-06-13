import { NextResponse } from "next/server";
import { settleSecondarySale } from "../../../../../../src/hedera/settleResale.js";
import { verifyWorldIdProof, extractNullifier } from "../../../../../../src/world/verifyProof.js";
import { requireUser } from "../../../../../../src/lib/auth.js";
import { resolveHederaAccountId } from "../../../../../../src/ens/resolve.js";

export async function POST(request, { params }) {
  try {
    const { tokenId, serial: serialStr } = await params;
    const serial = Number(serialStr);
    const body = await request.json();
    const { sellerAccountId, buyerAccountId: rawBuyerId, priceHbar = 50, proof } = body;

    if (!sellerAccountId || !rawBuyerId || !proof) {
      return NextResponse.json(
        { error: "sellerAccountId, buyerAccountId, and proof are required" },
        { status: 400 }
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

    const buyerAccountId = await resolveHederaAccountId(rawBuyerId);

    requireUser(sellerAccountId);
    requireUser(buyerAccountId);

    const result = await settleSecondarySale({
      tokenId,
      serial,
      sellerAccountId,
      buyerAccountId,
      priceHbar: Number(priceHbar),
      buyerNullifier,
    });

    return NextResponse.json({
      success: true,
      buyerAccountId,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Resale failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
