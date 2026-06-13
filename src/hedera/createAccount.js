import { AccountCreateTransaction, PrivateKey, Hbar } from "@hashgraph/sdk";
import { getClient } from "../client.js";

// Custodial user account. Used later, at the transfer/sale step (a buyer).
export async function createUserAccount(initialHbar = 60) {
  const client = getClient();
  try {
    const key = PrivateKey.generateECDSA();
    const tx = await new AccountCreateTransaction()
      .setECDSAKeyWithAlias(key.publicKey)      // EVM-compatible (recommended)
      .setInitialBalance(new Hbar(initialHbar)) // enough to buy a ticket + fees
      .setMaxAutomaticTokenAssociations(-1)     // auto-receive any token, no manual associate
      .execute(client);
    const accountId = (await tx.getReceipt(client)).accountId.toString();
    return { accountId, privateKey: key.toStringDer() };
  } finally {
    client.close();
  }
}


// const {
//   AccountId,
//   PrivateKey,
//   Client,
//   Hbar,
//   TokenCreateTransaction,
//   TokenType,
//   TokenSupplyType,
//   CustomRoyaltyFee,
//   CustomFixedFee,
// } = require("@hiero-ledger/sdk"); // v2.82.0

// async function main() {
//   let client;
//   try {
//     const MY_ACCOUNT_ID = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
//     const MY_PRIVATE_KEY = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);

//     client = Client.forTestnet();
//     client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

//     // ---- Permanent keys: must be set NOW, can never be added later ----
//     const adminKey    = PrivateKey.generateECDSA();
//     const supplyKey   = PrivateKey.generateECDSA(); // required to mint tickets
//     const freezeKey   = PrivateKey.generateECDSA(); // freeze used/stolen tickets
//     const pauseKey    = PrivateKey.generateECDSA(); // pause all (match cancelled)
//     const metadataKey = PrivateKey.generateECDSA(); // update NFT metadata later

//     // ---- 10% royalty to the issuer on every resale, with anti-evasion fallback ----
//     const royalty = new CustomRoyaltyFee()
//       .setNumerator(10)
//       .setDenominator(100)
//       .setFeeCollectorAccountId(MY_ACCOUNT_ID)
//       .setFallbackFee(new CustomFixedFee().setHbarAmount(new Hbar(5)));

//     // ---- Create the NFT ticket collection ----
//     const txTokenCreate = await new TokenCreateTransaction()
//       .setTokenName("WorldCup Ticket")
//       .setTokenSymbol("WCT")
//       .setTokenType(TokenType.NonFungibleUnique)
//       .setSupplyType(TokenSupplyType.Finite)
//       .setMaxSupply(10000)
//       .setInitialSupply(0)
//       .setTreasuryAccountId(MY_ACCOUNT_ID)
//       .setAdminKey(adminKey.publicKey)
//       .setSupplyKey(supplyKey.publicKey)
//       .setFreezeKey(freezeKey.publicKey)
//       .setPauseKey(pauseKey.publicKey)
//       .setMetadataKey(metadataKey.publicKey)
//       .setCustomFees([royalty])
//       .freezeWith(client);

//     const signed = await txTokenCreate.sign(adminKey);
//     const txResponse = await signed.execute(client);
//     const receipt = await txResponse.getReceipt(client);

//     const tokenId = receipt.tokenId;

//     console.log("--------------------------- Token Creation ---------------------------");
//     console.log("Receipt status :", receipt.status.toString());
//     console.log("Token ID       :", tokenId.toString());
//     console.log("Hashscan URL   :", "https://hashscan.io/testnet/token/" + tokenId.toString());

//     console.log("------------------------- SAVE THESE KEYS ----------------------------");
//     console.log("supplyKey   :", supplyKey.toStringDer());
//     console.log("freezeKey   :", freezeKey.toStringDer());
//     console.log("pauseKey    :", pauseKey.toStringDer());
//     console.log("metadataKey :", metadataKey.toStringDer());
//     console.log("adminKey    :", adminKey.toStringDer());
//   } catch (error) {
//     console.error(error);
//   } finally {
//     if (client) client.close();
//   }
// }

// main();