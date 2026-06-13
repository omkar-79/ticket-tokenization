import { NextResponse } from "next/server";
import { getTicket, getOwnershipHistory } from "../../../../../src/db/tickets.js";

export async function GET(_request, { params }) {
  try {
    const { tokenId, serial } = await params;
    const ticket = getTicket(tokenId, Number(serial));
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const history = getOwnershipHistory(tokenId, Number(serial));

    return NextResponse.json({
      tokenId,
      serial: Number(serial),
      ...(ticket.metadata_json ?? {}),
      metadataUri: ticket.metadata_uri,
      status: ticket.status,
      ensName: ticket.ens_name ?? null,
      ownershipHistory: history,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load ticket";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
