import { NextResponse } from "next/server";
import { createGatePass, encodeGatePass } from "../../../../../../src/lib/gatePass.js";
import { getTicket, getCurrentOwner, getPassGeneration } from "../../../../../../src/db/tickets.js";
import { getAccountIdFromRequest, requireUser } from "../../../../../../src/lib/auth.js";

export async function GET(request, { params }) {
  try {
    const { tokenId, serial: serialStr } = await params;
    const serial = Number(serialStr);
    const accountId = getAccountIdFromRequest(request);
    requireUser(accountId);

    const ticket = getTicket(tokenId, serial);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    if (ticket.status === "used") {
      return NextResponse.json({ error: "Ticket already checked in" }, { status: 400 });
    }

    const owner = getCurrentOwner(tokenId, serial);
    if (!owner || owner.owner_account_id !== accountId) {
      return NextResponse.json(
        { error: "Only the current ticket holder can generate a gate pass" },
        { status: 403 }
      );
    }

    const passGeneration = getPassGeneration(tokenId, serial);
    const pass = createGatePass({
      tokenId,
      serial,
      ownerAccountId: accountId,
      passGeneration,
    });

    return NextResponse.json({
      pass,
      passJson: encodeGatePass(pass),
      passGeneration,
      expiresAt: pass.exp,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create gate pass";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
