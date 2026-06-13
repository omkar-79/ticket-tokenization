import "dotenv/config";
import { getDb } from "../src/db/db.js";
import { setRole, findByAccountId } from "../src/db/users.js";

const accountId = process.argv[2];
if (!accountId) {
  console.error("Usage: node scripts/promote-organizer.js 0.0.xxxx");
  process.exit(1);
}

getDb();
const user = findByAccountId(accountId);
if (!user) {
  console.error("Account not found in DB:", accountId);
  process.exit(1);
}

const updated = setRole(accountId, "organizer");
console.log("Promoted to organizer:", updated.account_id);
