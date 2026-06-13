import { NextResponse } from "next/server";
import { getToken } from "../../../../../src/db/tokens.js";
import { promoteToReseller } from "../../../../../src/db/users.js";
import { requireUser } from "../../../../../src/lib/auth.js";
import { assertTokenTransferable } from "../../../../../src/lib/ticketGuards.js";
import { getAppBaseUrl, ticketMetadataUri } from "../../../../../src/lib/tickets.js";
import { primaryPurchase } from "../../../../../src/hedera/primaryPurchase.js";

export async function POST(request, { params }) {
  try {
    const { tokenId } = await params;
    const body = await request.json();
    const { buyerAccountId } = body;

    if (!buyerAccountId) {
      return NextResponse.json({ error: "buyerAccountId is required" }, { status: 400 });
    }

    const token = getToken(tokenId);
    if (!token) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    try {
      assertTokenTransferable(tokenId);
    } catch (guardErr) {
      const message = guardErr instanceof Error ? guardErr.message : "Event not available";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const priceHbar = token.primary_price_hbar;
    if (!Number.isFinite(priceHbar) || priceHbar <= 0) {
      return NextResponse.json({ error: "Collection has no valid face value price" }, { status: 400 });
    }

    const buyer = requireUser(buyerAccountId);
    const baseUrl = getAppBaseUrl(request);
    const predictedSerial = token.minted_count + 1;
    const metadataUri = ticketMetadataUri(baseUrl, tokenId, predictedSerial);

    const result = await primaryPurchase({
      tokenId,
      buyerAccountId: buyer.account_id,
      buyerPrivateKey: buyer.private_key,
      buyerNullifier: buyer.nullifier_hash,
      priceHbar,
      metadataUri,
      ticketMeta: { event: token.name, section: "General" },
    });

    promoteToReseller(buyer.account_id);

    return NextResponse.json({
      success: true,
      tokenId,
      serial: result.serial,
      txId: result.txId,
      hashscanUrl: result.hashscanUrl,
      mintedCount: result.mintedCount,
      maxSupply: result.maxSupply,
      faceValueHbar: priceHbar,
      owner: buyer.account_id,
      ensName: result.ensName ?? null,
      ensWarning: result.ensWarning ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Primary purchase failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
