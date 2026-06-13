// Simulates scanning a ticket at the venue gate.
// 1) freezes the holder on-chain so the used ticket can't be resold
// 2) marks the ticket "used" in the DB (per-serial guard your resale logic checks)
//
// Usage: node scripts/07-scan-gate.js [serial]
import { loadState } from "../src/state.js";
import { getDb } from "../src/db/db.js";
import { getCurrentOwner, updateTicketStatus } from "../src/db/tickets.js";
import { freezeHolder } from "../src/hedera/compliance.js";

const serial = Number(process.argv[2] ?? 1);
const { tokenId, keys } = loadState();
if (!tokenId || !keys?.freeze) {
  throw new Error("Need tokenId and freeze key in state.json");
}

getDb();
const owner = getCurrentOwner(tokenId, serial);
if (!owner?.owner_account_id) {
  throw new Error(`No recorded owner for ticket #${serial} — sell it first (05/06).`);
}

const result = await freezeHolder({
  tokenId,
  accountId: owner.owner_account_id,
  freezeKeyDer: keys.freeze,
});

updateTicketStatus(tokenId, serial, "used");

console.log(`Gate scan: ticket #${serial} valid — entry granted.`);
console.log("Holder frozen for this token (cannot resell):", owner.owner_account_id);
console.log("On-chain status :", result.status);
console.log("DB status       : used");
console.log("Note: freeze is account-level — it locks ALL of this holder's tickets for this token.");