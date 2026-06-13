import { NextResponse } from "next/server";
import { cancelListing, getListing } from "../../../../src/db/listings.js";
import { ownedStatusForTicket, updateTicketStatus } from "../../../../src/db/tickets.js";
import { getAccountIdFromRequest, requireUser } from "../../../../src/lib/auth.js";

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const listing = getListing(Number(id));
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    return NextResponse.json({ listing });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load listing";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const accountId = getAccountIdFromRequest(request);
    requireUser(accountId);

    const listing = cancelListing(Number(id), accountId);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    updateTicketStatus(
      listing.tokenId,
      listing.serial,
      ownedStatusForTicket(listing.tokenId, listing.serial)
    );

    return NextResponse.json({ success: true, listing });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to cancel listing";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
