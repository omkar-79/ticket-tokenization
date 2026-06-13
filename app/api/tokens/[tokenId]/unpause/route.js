import { NextResponse } from "next/server";
import { unpauseMatch } from "../../../../../src/hedera/venue.js";
import { getAccountIdFromRequest, requireOrganizerOfToken } from "../../../../../src/lib/auth.js";

export async function POST(request, { params }) {
  try {
    const { tokenId } = await params;
    const accountId = getAccountIdFromRequest(request);
    requireOrganizerOfToken(accountId, tokenId);

    const result = await unpauseMatch({ tokenId });

    return NextResponse.json({ success: true, ...result, paused: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to resume match";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
