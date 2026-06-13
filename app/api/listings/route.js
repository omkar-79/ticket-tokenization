import { NextResponse } from "next/server";
import {
  createListing,
  listOpenListings,
  listOpenListingsByToken,
  expireStaleRecords,
  getOpenListingForTicket,
  LISTING_EXPIRY_HOURS,
} from "../../../src/db/listings.js";
import { getCurrentOwner, getTicket, updateTicketStatus } from "../../../src/db/tickets.js";
import { getAccountIdFromRequest, requireUser } from "../../../src/lib/auth.js";
import { assertTokenTransferable, assertTicketResellable } from "../../../src/lib/ticketGuards.js";

export async function GET(request) {
  try {
    expireStaleRecords();
    const tokenId = new URL(request.url).searchParams.get("tokenId");
    const listings = tokenId ? listOpenListingsByToken(tokenId) : listOpenListings();
    return NextResponse.json({ listings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load listings";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request) {
  try {
    const accountId = getAccountIdFromRequest(request);
    requireUser(accountId);

    const body = await request.json();
    const { tokenId, serial, askPriceHbar, minBidHbar } = body;

    if (!tokenId || serial == null || askPriceHbar == null) {
      return NextResponse.json(
        { error: "tokenId, serial, and askPriceHbar are required" },
        { status: 400 }
      );
    }

    const ask = Number(askPriceHbar);
    if (!Number.isFinite(ask) || ask <= 0) {
      return NextResponse.json({ error: "askPriceHbar must be positive" }, { status: 400 });
    }

    const ticket = getTicket(tokenId, Number(serial));
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    try {
      assertTokenTransferable(tokenId);
      assertTicketResellable(tokenId, Number(serial));
    } catch (guardErr) {
      const message = guardErr instanceof Error ? guardErr.message : "Ticket cannot be listed";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const owner = getCurrentOwner(tokenId, Number(serial));
    if (!owner || owner.owner_account_id !== accountId) {
      return NextResponse.json({ error: "You do not own this ticket" }, { status: 403 });
    }

    const existing = getOpenListingForTicket(tokenId, Number(serial));
    if (existing) {
      return NextResponse.json(
        { error: "An active listing already exists for this ticket", listingId: existing.id },
        { status: 409 }
      );
    }

    const listing = createListing({
      tokenId,
      serial: Number(serial),
      sellerAccountId: accountId,
      askPriceHbar: ask,
      minBidHbar: minBidHbar != null ? Number(minBidHbar) : null,
    });

    updateTicketStatus(tokenId, Number(serial), "listed_for_resale");

    return NextResponse.json({
      success: true,
      listing,
      expiresInHours: LISTING_EXPIRY_HOURS,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create listing";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
