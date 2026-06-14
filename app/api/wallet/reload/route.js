import { NextResponse } from "next/server";
import { getAccountIdFromRequest, requireUser, requireRole } from "../../../../src/lib/auth.js";
import { fundUserAccount } from "../../../../src/hedera/fundAccount.js";
import { getHbarBalance } from "../../../../src/hedera/mirror.js";
import { getOperatorId } from "../../../../src/client.js";

const DEFAULT_RELOAD_HBAR = Number(process.env.RELOAD_HBAR_AMOUNT ?? 60);
const MAX_RELOAD_HBAR = Number(process.env.MAX_RELOAD_HBAR ?? 200);

export async function POST(request) {
  try {
    const accountId = getAccountIdFromRequest(request);
    if (!accountId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const user = requireUser(accountId);
    requireRole(user, "purchaser", "reseller");

    const body = await request.json().catch(() => ({}));
    const amountHbar = Number(body.amountHbar ?? DEFAULT_RELOAD_HBAR);

    if (!Number.isFinite(amountHbar) || amountHbar <= 0) {
      return NextResponse.json({ error: "amountHbar must be a positive number" }, { status: 400 });
    }
    if (amountHbar > MAX_RELOAD_HBAR) {
      return NextResponse.json(
        { error: `Maximum reload is ${MAX_RELOAD_HBAR} HBAR per request` },
        { status: 400 }
      );
    }

    const result = await fundUserAccount(accountId, amountHbar);
    const balanceHbar = await getHbarBalance(accountId);

    return NextResponse.json({
      success: true,
      amountHbar,
      fundedFrom: getOperatorId().toString(),
      balanceHbar,
      transactionId: result.transactionId,
      hashscanUrl: result.hashscanUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "HBAR reload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
