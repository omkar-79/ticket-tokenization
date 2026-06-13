import { NextResponse } from "next/server";
import { createUserAccount } from "../../../src/hedera/createAccount.js";
import { findByNullifier, createUser } from "../../../src/db/users.js";
import { verifyWorldIdProof, extractNullifier } from "../../../src/world/verifyProof.js";
import { saveState } from "../../../src/state.js";
import { validateEnsLabel, buildUserTextRecords } from "../../../src/ens/identity.js";
import { provisionUserSubname } from "../../../src/ens/provision.js";
import { isEnsConfigured } from "../../../src/ens/config.js";

async function fetchEvmAddress(accountId) {
  await new Promise((r) => setTimeout(r, 5000));
  const res = await fetch(
    `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.evm_address ?? null;
}

export async function POST(request) {
  try {
    const {
      proof,
      role: requestedRole = "purchaser",
      ensLabel: rawEnsLabel,
      organizerInviteCode,
    } = await request.json();
    const role = requestedRole === "organizer" ? "organizer" : "purchaser";

    if (role === "organizer") {
      const expected = process.env.ORGANIZER_INVITE_CODE;
      if (!expected) {
        return NextResponse.json(
          { error: "ORGANIZER_INVITE_CODE is not configured" },
          { status: 500 }
        );
      }
      if (organizerInviteCode?.trim() !== expected) {
        return NextResponse.json(
          { error: "Invalid organizer invitation code" },
          { status: 403 }
        );
      }
    }

    let ensLabel = null;
    if (isEnsConfigured()) {
      if (!rawEnsLabel?.trim()) {
        return NextResponse.json({ error: "Name is required" }, { status: 400 });
      }
      ensLabel = validateEnsLabel(rawEnsLabel);
    }

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
    if (existing) {
      return NextResponse.json(
        {
          error: "This human identity already has an account associated with it.",
          accountId: existing.account_id,
          role: existing.role,
        },
        { status: 409 }
      );
    }

    const buyer = await createUserAccount(60);

    let ens = null;
    if (ensLabel) {
      const textRecords = buildUserTextRecords({ accountId: buyer.accountId });
      ens = await provisionUserSubname({ label: ensLabel, textRecords });
    }

    const evmAddress = await fetchEvmAddress(buyer.accountId);

    createUser({
      nullifierHash,
      accountId: buyer.accountId,
      privateKey: buyer.privateKey,
      ensName: ens?.ensName ?? null,
      ensLabel: ens?.ensLabel ?? null,
      ensRecords: ens?.textRecords ?? null,
      role,
    });

    saveState({ buyer: { ...buyer, evmAddress } });

    return NextResponse.json({
      success: true,
      accountId: buyer.accountId,
      role,
      evmAddress,
      ens,
      hashscanUrl: `https://hashscan.io/testnet/account/${buyer.accountId}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onboarding failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
