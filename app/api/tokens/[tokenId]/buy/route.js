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
    const { buyerAccountId, quantity: rawQuantity } = body;

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

    const remaining = token.max_supply - token.minted_count;
    const quantity = Math.min(
      Math.max(1, Number.parseInt(String(rawQuantity ?? 1), 10) || 1),
      remaining
    );

    if (remaining <= 0) {
      return NextResponse.json({ error: "Sold out" }, { status: 400 });
    }

    if (quantity > remaining) {
      return NextResponse.json(
        { error: `Only ${remaining} ticket${remaining === 1 ? "" : "s"} left` },
        { status: 400 }
      );
    }

    const buyer = requireUser(buyerAccountId);
    const baseUrl = getAppBaseUrl(request);
    const tickets = [];
    let ensWarning = null;

    for (let i = 0; i < quantity; i += 1) {
      const current = getToken(tokenId);
      if (!current || current.minted_count >= current.max_supply) {
        break;
      }

      const predictedSerial = current.minted_count + 1;
      const metadataUri = ticketMetadataUri(baseUrl, tokenId, predictedSerial);

      const result = await primaryPurchase({
        tokenId,
        buyerAccountId: buyer.account_id,
        buyerPrivateKey: buyer.private_key,
        buyerNullifier: buyer.nullifier_hash,
        priceHbar,
        metadataUri,
        ticketMeta: { event: current.name, section: "General" },
      });

      tickets.push({
        serial: result.serial,
        txId: result.txId,
        hashscanUrl: result.hashscanUrl,
        ensName: result.ensName ?? null,
      });

      if (result.ensWarning && !ensWarning) {
        ensWarning = result.ensWarning;
      }
    }

    if (tickets.length === 0) {
      return NextResponse.json({ error: "Sold out" }, { status: 400 });
    }

    promoteToReseller(buyer.account_id);

    const last = tickets[tickets.length - 1];
    const latest = getToken(tokenId);

    return NextResponse.json({
      success: true,
      tokenId,
      quantity: tickets.length,
      tickets,
      serial: last.serial,
      txId: last.txId,
      hashscanUrl: last.hashscanUrl,
      mintedCount: latest?.minted_count ?? last.serial,
      maxSupply: latest?.max_supply ?? token.max_supply,
      faceValueHbar: priceHbar,
      totalHbar: priceHbar * tickets.length,
      owner: buyer.account_id,
      ensName: last.ensName ?? null,
      ensWarning,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Primary purchase failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
