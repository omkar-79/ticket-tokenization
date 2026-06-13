import { NextResponse } from "next/server";
import { listTokens, getToken } from "../../../src/db/tokens.js";
import { findByAccountId } from "../../../src/db/users.js";
import { countOpenListingsByToken } from "../../../src/db/listings.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function toCollection(token) {
  const organizer = findByAccountId(token.organizer_account_id);
  return {
    tokenId: token.token_id,
    name: token.name,
    symbol: token.symbol,
    organizerAccountId: token.organizer_account_id,
    organizerEnsName: organizer?.ens_name ?? null,
    faceValueHbar: token.primary_price_hbar,
    mintedCount: token.minted_count,
    maxSupply: token.max_supply,
    remaining: token.max_supply - token.minted_count,
    soldOut: token.minted_count >= token.max_supply,
    resaleListingCount: countOpenListingsByToken(token.token_id),
    paused: Boolean(token.paused),
  };
}

export async function GET(request) {
  try {
    const tokenId = new URL(request.url).searchParams.get("tokenId");

    if (tokenId) {
      const token = getToken(tokenId);
      if (!token) {
        return NextResponse.json({ error: "Collection not found" }, { status: 404 });
      }
      return NextResponse.json({
        collection: toCollection(token),
      });
    }

    const tokens = listTokens();
    const collections = tokens.map((token) => toCollection(token));

    return NextResponse.json(
      { collections },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load marketplace";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
