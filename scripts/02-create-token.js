import { writeFileSync } from "fs";
import { createTicketToken } from "../src/hedera/createToken.js";
import { createToken as saveToken } from "../src/db/tokens.js";
import { findByAccountId } from "../src/db/users.js";
import "dotenv/config";

const maxSupply = Number(process.argv[2] ?? 10000);
const faceValueHbar = Number(process.argv[3] ?? 50);
const name = process.argv[4] ?? "World Cup Ticket";
const symbol = process.argv[5] ?? "WCT";

const organizer = findByAccountId(process.env.OPERATOR_ID);
if (!organizer) {
  throw new Error("Operator not in DB. Run the app once to seed operator, or onboard first.");
}

const result = await createTicketToken({
  organizerAccountId: organizer.account_id,
  organizerPrivateKey: organizer.private_key,
  maxSupply,
  name,
  symbol,
});

saveToken({
  tokenId: result.tokenId,
  organizerAccountId: organizer.account_id,
  name,
  symbol,
  maxSupply,
  primaryPriceHbar: faceValueHbar,
  keys: result.keys,
});

writeFileSync(
  "state.json",
  JSON.stringify({ tokenId: result.tokenId, keys: result.keys }, null, 2)
);

console.log("Token created:", result.tokenId);
console.log("Max supply:", maxSupply);
console.log("Face value:", faceValueHbar, "HBAR");
console.log("Organizer:", organizer.account_id);
console.log("View it: https://hashscan.io/testnet/token/" + result.tokenId);
console.log("Saved tokenId + keys to state.json and DB");
