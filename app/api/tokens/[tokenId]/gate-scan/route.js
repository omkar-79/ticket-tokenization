import { NextResponse } from "next/server";
import { scanTicketAtGate } from "../../../../../src/hedera/venue.js";
import { getAccountIdFromRequest, requireOrganizerOfToken } from "../../../../../src/lib/auth.js";

export async function POST(request, { params }) {
  try {
    const { tokenId } = await params;
    const accountId = getAccountIdFromRequest(request);
    requireOrganizerOfToken(accountId, tokenId);

    const body = await request.json();
    const serial = Number(body.serial);
    if (!Number.isFinite(serial) || serial <= 0) {
      return NextResponse.json({ error: "serial is required" }, { status: 400 });
    }

    const result = await scanTicketAtGate({ tokenId, serial });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gate scan failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
