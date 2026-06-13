import { NextResponse } from "next/server";
import { findByAccountId } from "../../../../src/db/users.js";
import {
  listTicketsByOwner,
  listFormerTicketsByOwner,
  getOwnershipHistory,
} from "../../../../src/db/tickets.js";
import { getHbarBalance } from "../../../../src/hedera/mirror.js";
import { getToken } from "../../../../src/db/tokens.js";

export async function GET(_request, { params }) {
  try {
    const { accountId } = await params;
    const user = findByAccountId(accountId);
    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const tickets = listTicketsByOwner(accountId).map((t) => {
      const token = getToken(t.token_id);
      return {
        tokenId: t.token_id,
        serial: t.serial,
        eventName: token?.name ?? null,
        eventSymbol: token?.symbol ?? null,
        status: t.status,
        acquisition: t.acquisition,
        priceHbar: t.price_hbar,
        acquiredAt: t.acquired_at,
        ensName: t.ens_name ?? null,
        history: getOwnershipHistory(t.token_id, t.serial),
      };
    });

    const formerTickets = listFormerTicketsByOwner(accountId).map((t) => {
      const token = getToken(t.tokenId);
      return {
        ...t,
        eventName: token?.name ?? null,
        eventSymbol: token?.symbol ?? null,
      };
    });
    const balanceHbar = await getHbarBalance(accountId);

    return NextResponse.json({
      user: {
        accountId: user.account_id,
        role: user.role,
        ensName: user.ens_name,
        ensLabel: user.ens_label,
        ensTextRecords: user.ens_records_json ? JSON.parse(user.ens_records_json) : null,
      },
      balanceHbar,
      tickets,
      formerTickets,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load wallet";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
