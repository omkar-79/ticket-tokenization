import { NextResponse } from "next/server";
import { pauseMatch } from "../../../../../src/hedera/venue.js";
import { getAccountIdFromRequest, requireOrganizerOfToken } from "../../../../../src/lib/auth.js";

export async function POST(request, { params }) {
  try {
    const { tokenId } = await params;
    const accountId = getAccountIdFromRequest(request);
    requireOrganizerOfToken(accountId, tokenId);

    const result = await pauseMatch({ tokenId });

    return NextResponse.json({ success: true, ...result, paused: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to pause match";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
