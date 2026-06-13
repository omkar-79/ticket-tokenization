import { NextResponse } from "next/server";
import { createTicketToken } from "../../../src/hedera/createToken.js";
import { createToken as saveToken, listTokensByOrganizer } from "../../../src/db/tokens.js";
import { getTokenRoyaltySummary } from "../../../src/lib/royalties.js";
import { getAccountIdFromRequest, requireUser, requireRole } from "../../../src/lib/auth.js";

export async function GET(request) {
  try {
    const accountId = getAccountIdFromRequest(request);
    if (!accountId) {
      return NextResponse.json({ error: "X-Account-Id header required" }, { status: 401 });
    }
    const user = requireUser(accountId);
    requireRole(user, "organizer");
    const tokens = listTokensByOrganizer(accountId).map((token) => ({
      ...token,
      ...getTokenRoyaltySummary(token.token_id),
    }));
    return NextResponse.json({ tokens });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list tokens";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request) {
  try {
    const accountId = getAccountIdFromRequest(request);
    const user = requireUser(accountId);
    requireRole(user, "organizer");

    const body = await request.json();
    const { name, symbol, maxSupply, faceValueHbar, royaltyPercent } = body;
    if (!name || !symbol || !maxSupply || faceValueHbar == null) {
      return NextResponse.json(
        { error: "name, symbol, maxSupply, and faceValueHbar are required" },
        { status: 400 }
      );
    }
    const primaryPriceHbar = Number(faceValueHbar);
    if (!Number.isFinite(primaryPriceHbar) || primaryPriceHbar <= 0) {
      return NextResponse.json(
        { error: "faceValueHbar must be a positive number" },
        { status: 400 }
      );
    }

    const royalty = royaltyPercent != null ? Number(royaltyPercent) : 10;
    if (!Number.isFinite(royalty) || royalty < 0 || royalty > 50) {
      return NextResponse.json(
        { error: "royaltyPercent must be between 0 and 50" },
        { status: 400 }
      );
    }

    const royaltyNumerator = Math.round(royalty);
    const royaltyDenominator = 100;

    const result = await createTicketToken({
      organizerAccountId: user.account_id,
      organizerPrivateKey: user.private_key,
      maxSupply: Number(maxSupply),
      name,
      symbol,
      royaltyNumerator,
      royaltyDenominator,
    });

    const token = saveToken({
      tokenId: result.tokenId,
      organizerAccountId: user.account_id,
      name,
      symbol,
      maxSupply: Number(maxSupply),
      primaryPriceHbar,
      royaltyNumerator,
      royaltyDenominator,
      keys: result.keys,
    });

    return NextResponse.json({
      success: true,
      tokenId: result.tokenId,
      token,
      hashscanUrl: `https://hashscan.io/testnet/token/${result.tokenId}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token creation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
