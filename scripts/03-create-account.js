// Dev-only — production onboarding uses /api/verify-and-onboard.
import { createUserAccount } from "../src/hedera/createAccount.js";
import { saveState } from "../src/state.js";

const buyer = await createUserAccount(60);

// Mirror node lags a few seconds behind consensus, so wait before querying.
let evmAddress;
await new Promise((r) => setTimeout(r, 5000));
const res = await fetch(
  `https://testnet.mirrornode.hedera.com/api/v1/accounts/${buyer.accountId}`
);
if (res.ok) {
  const data = await res.json();
  evmAddress = data.evm_address;
}

console.log("------------------------------ Create Account ------------------------------");
console.log("Account ID   :", buyer.accountId);
console.log("EVM Address  :", evmAddress ?? "(not indexed yet — check HashScan)");
console.log("Private key  :", buyer.privateKey);
console.log("Hashscan     : https://hashscan.io/testnet/account/" + buyer.accountId);

saveState({ buyer: { ...buyer, evmAddress } });
console.log("Saved buyer to state.json");