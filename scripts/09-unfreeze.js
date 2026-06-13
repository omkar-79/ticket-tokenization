// Reset helper for re-running demos: unfreezes a holder and clears "used".
// Usage: node scripts/09-unfreeze.js [serial]
import { loadState } from "../src/state.js";
import { getDb } from "../src/db/db.js";
import { getCurrentOwner, updateTicketStatus } from "../src/db/tickets.js";
import { unfreezeHolder } from "../src/hedera/compliance.js";

const serial = Number(process.argv[2] ?? 1);
const { tokenId, keys } = loadState();
if (!tokenId || !keys?.freeze) {
  throw new Error("Need tokenId and freeze key in state.json");
}

getDb();
const owner = getCurrentOwner(tokenId, serial);
if (!owner?.owner_account_id) {
  throw new Error(`No recorded owner for ticket #${serial}`);
}

const result = await unfreezeHolder({
  tokenId,
  accountId: owner.owner_account_id,
  freezeKeyDer: keys.freeze,
});

updateTicketStatus(tokenId, serial, "owned");

console.log(`Reset: ticket #${serial} unfrozen for`, owner.owner_account_id);
console.log("On-chain status :", result.status);
console.log("DB status       : owned (transferable again)");