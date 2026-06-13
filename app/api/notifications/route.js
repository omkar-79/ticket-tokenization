import { NextResponse } from "next/server";
import { countNotifications } from "../../../src/db/listings.js";
import { getAccountIdFromRequest, requireUser } from "../../../src/lib/auth.js";

export async function GET(request) {
  try {
    const accountId = getAccountIdFromRequest(request);
    if (!accountId) {
      return NextResponse.json({ acceptedBidsToConfirm: 0, pendingBidsOnYourListings: 0 });
    }
    requireUser(accountId);
    return NextResponse.json(countNotifications(accountId));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load notifications";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
