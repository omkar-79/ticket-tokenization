import { NextResponse } from "next/server";
import { getToken } from "../../../../../src/db/tokens.js";
import { findByAccountId } from "../../../../../src/db/users.js";
import { listTickets, getCurrentOwner } from "../../../../../src/db/tickets.js";
import {
  enrichTicketsWithRoyalties,
  getTokenRoyaltySummary,
} from "../../../../../src/lib/royalties.js";

export async function GET(_request, { params }) {
  try {
    const { tokenId } = await params;
    const token = getToken(tokenId);
    if (!token) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    const organizer = findByAccountId(token.organizer_account_id);

    const baseTickets = listTickets(tokenId).map((t) => ({
      ...t,
      currentOwner: getCurrentOwner(tokenId, t.serial),
    }));

    const tickets = enrichTicketsWithRoyalties(tokenId, baseTickets);
    const royaltySummary = getTokenRoyaltySummary(tokenId);

    return NextResponse.json({
      token: {
        ...token,
        organizerEnsName: organizer?.ens_name ?? null,
      },
      tickets,
      royaltySummary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list tickets";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
