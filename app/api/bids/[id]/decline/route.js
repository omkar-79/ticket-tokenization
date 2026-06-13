import { NextResponse } from "next/server";
import { declineBid, getBid } from "../../../../../src/db/listings.js";
import { getAccountIdFromRequest, requireUser } from "../../../../../src/lib/auth.js";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const accountId = getAccountIdFromRequest(request);
    requireUser(accountId);

    const bid = declineBid(Number(id), accountId);

    return NextResponse.json({ success: true, bid });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to decline bid";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
