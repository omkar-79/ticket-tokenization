// Resolve ENS text records for demo / judging.
// Usage: node scripts/ens-resolve.js <name> [textKey]
import "dotenv/config";
import { getEnsTextRecord, resolveHederaAccountId } from "../src/ens/resolve.js";
import { isEnsConfigured } from "../src/ens/config.js";

const name = process.argv[2];
const key = process.argv[3] ?? "hedera.account_id";

if (!name) {
  console.error("Usage: node scripts/ens-resolve.js <ensName> [textKey]");
  process.exit(1);
}

if (!isEnsConfigured()) {
  console.error("ENS is not configured. Set ENS_PARENT_NAME, ENS_OPERATOR_KEY, ENS_RPC_URL in .env");
  process.exit(1);
}

try {
  if (key === "hedera.account_id" && !process.argv[3]) {
    const accountId = await resolveHederaAccountId(name);
    console.log("hedera.account_id:", accountId);
  } else {
    const value = await getEnsTextRecord(name.includes(".") ? name : `${name}.${process.env.ENS_PARENT_NAME}`, key);
    console.log(`${key}:`, value || "(empty)");
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
