import { NextResponse } from "next/server";
import { mintTickets } from "../../../../../src/hedera/mintTicket.js";
import { getToken, incrementMintedCount } from "../../../../../src/db/tokens.js";
import {
  insertTicket,
  recordOwnership,
} from "../../../../../src/db/tickets.js";
import { getAccountIdFromRequest, requireUser, requireRole } from "../../../../../src/lib/auth.js";
import { getAppBaseUrl, ticketMetadataUri } from "../../../../../src/lib/tickets.js";

export async function POST(request, { params }) {
  try {
    const { tokenId } = await params;
    const accountId = getAccountIdFromRequest(request);
    const user = requireUser(accountId);
    requireRole(user, "organizer");

    const token = getToken(tokenId);
    if (!token) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }
    if (token.organizer_account_id !== user.account_id) {
      return NextResponse.json({ error: "Not token organizer" }, { status: 403 });
    }

    const body = await request.json();
    const count = Number(body.count ?? 1);
    const ticketMeta = body.metadata ?? { event: "World Cup", section: "General" };

    if (count < 1 || count > 10) {
      return NextResponse.json({ error: "count must be 1-10 per request" }, { status: 400 });
    }
    if (token.minted_count + count > token.max_supply) {
      return NextResponse.json(
        {
          error: `Mint limit exceeded: ${token.minted_count}/${token.max_supply} minted`,
        },
        { status: 400 }
      );
    }

    const baseUrl = getAppBaseUrl(request);
    const pointers = [];
    for (let i = 0; i < count; i++) {
      const predictedSerial = token.minted_count + 1 + i;
      pointers.push(ticketMetadataUri(baseUrl, tokenId, predictedSerial));
    }

    const { serials } = await mintTickets(tokenId, token.keys.supply, pointers);

    for (let i = 0; i < serials.length; i++) {
      const serial = Number(serials[i]);
      const metadataUri = ticketMetadataUri(baseUrl, tokenId, serial);
      const metadataJson = {
        ...ticketMeta,
        tokenId,
        serial,
        organizerAccountId: token.organizer_account_id,
      };
      insertTicket({
        tokenId,
        serial,
        metadataUri,
        metadataJson,
        status: "minted",
      });
      recordOwnership({
        tokenId,
        serial,
        ownerAccountId: token.organizer_account_id,
        ownerNullifier: null,
        acquisition: "primary",
        priceHbar: 0,
        txId: null,
      });
    }

    const updated = incrementMintedCount(tokenId, serials.length);

    return NextResponse.json({
      success: true,
      serials,
      mintedCount: updated.minted_count,
      maxSupply: updated.max_supply,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Mint failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
