import { NextResponse } from "next/server";
import { findByNullifier } from "../../../src/db/users.js";
import { verifyWorldIdProof, extractNullifier } from "../../../src/world/verifyProof.js";

export async function POST(request) {
  try {
    const { proof } = await request.json();
    const nullifierHash = extractNullifier(proof);
    if (!nullifierHash) {
      return NextResponse.json({ error: "Missing proof" }, { status: 400 });
    }

    const action = process.env.WORLD_ACTION;
    if (!action) {
      return NextResponse.json({ error: "WORLD_ACTION is not configured" }, { status: 500 });
    }

    await verifyWorldIdProof(proof, action);

    const existing = findByNullifier(nullifierHash);
    if (!existing) {
      return NextResponse.json(
        { error: "No wallet found for this identity. Create one on the onboard page first." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      accountId: existing.account_id,
      role: existing.role,
      hashscanUrl: `https://hashscan.io/testnet/account/${existing.account_id}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
