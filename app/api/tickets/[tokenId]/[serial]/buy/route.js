import { NextResponse } from "next/server";
import { getToken } from "../../../../../../src/db/tokens.js";
import { getTicket } from "../../../../../../src/db/tickets.js";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Pre-minted serial sales are disabled. Use POST /api/tokens/{tokenId}/buy to mint on purchase.",
    },
    { status: 410 }
  );
}

// Kept for reselling already-owned tickets — see /resell route.
