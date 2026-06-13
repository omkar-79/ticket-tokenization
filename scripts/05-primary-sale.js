import "dotenv/config";
import { getDb } from "../src/db/db.js";
import { loadState } from "../src/state.js";
import { getToken } from "../src/db/tokens.js";
import { findByAccountId, promoteToReseller } from "../src/db/users.js";
import { primaryPurchase } from "../src/hedera/primaryPurchase.js";

const { tokenId, buyer } = loadState();

if (!tokenId || !buyer?.accountId) {
  throw new Error("Need tokenId in state.json and buyer from onboarding");
}

getDb();
const token = getToken(tokenId);
if (!token) {
  throw new Error("Token not in DB. Run scripts/02-create-token.js first.");
}

const purchaser = findByAccountId(buyer.accountId);
if (!purchaser) {
  throw new Error("Buyer not found in DB");
}

const priceHbar = token.primary_price_hbar;
if (!Number.isFinite(priceHbar) || priceHbar <= 0) {
  throw new Error("Token has no face value; recreate with scripts/02-create-token.js");
}

const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
const predictedSerial = token.minted_count + 1;
const metadataUri = `${baseUrl}/api/tickets/${tokenId}/${predictedSerial}`;

const result = await primaryPurchase({
  tokenId,
  buyerAccountId: purchaser.account_id,
  buyerPrivateKey: purchaser.private_key,
  buyerNullifier: purchaser.nullifier_hash,
  priceHbar,
  metadataUri,
  ticketMeta: { event: token.name, section: "General" },
});

promoteToReseller(purchaser.account_id);

console.log("Mint-on-buy complete");
console.log("Serial:", result.serial);
console.log("TX:", result.txId);
console.log("HashScan:", result.hashscanUrl);
console.log("Owner:", purchaser.account_id);
console.log(`Sold ${result.mintedCount}/${result.maxSupply} @ ${priceHbar} HBAR face value`);
