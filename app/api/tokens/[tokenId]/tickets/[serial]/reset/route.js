import { NextResponse } from "next/server";
import { resetTicketForDemo } from "../../../../../../../src/hedera/venue.js";
import { getAccountIdFromRequest, requireOrganizerOfToken } from "../../../../../../../src/lib/auth.js";

export async function POST(request, { params }) {
  try {
    const { tokenId, serial: serialParam } = await params;
    const accountId = getAccountIdFromRequest(request);
    requireOrganizerOfToken(accountId, tokenId);

    const serial = Number(serialParam);
    if (!Number.isFinite(serial) || serial <= 0) {
      return NextResponse.json({ error: "Invalid serial" }, { status: 400 });
    }

    const result = await resetTicketForDemo({ tokenId, serial });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reset ticket";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
