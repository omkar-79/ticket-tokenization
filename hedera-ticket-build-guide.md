# Anti-Scalp Ticket Tokenization — Build Guide

**Target prizes:** Hedera Tokenization ($3,000) + World ID Track B ($2,500) + ENS pool (TBD).
**Stack model:** Custodial accounts, Hedera testnet, HBAR payments for the core (USDC later).

> Accuracy note: exact method names in `@hashgraph/sdk` shift slightly between versions.
> If a call below doesn't resolve, check the official index at https://docs.hedera.com/llms.txt
> and the copy-paste examples at https://github.com/hedera-dev/hedera-code-snippets.

---

## 1. Exact tools

| Purpose | Tool | Notes |
|---|---|---|
| Operator/testnet account + HBAR | **portal.hedera.com** | One account for your team = backend signer |
| Hedera operations | **@hashgraph/sdk** (Node) | Token create, mint, transfer, accounts, HCS |
| Read balances / holdings / history | **Hedera Mirror Node REST** | `https://testnet.mirrornode.hedera.com` — no SDK, just fetch |
| App (frontend + API) | **Next.js + TypeScript** | API routes run the SDK server-side |
| Database | **Postgres (Supabase)** or **SQLite + Prisma** | Stores users, account keys (encrypted), resale flags/counts, World ID nullifiers |
| Proof of human | **@worldcoin/idkit** + backend verify | Verify endpoint: `https://developer.worldcoin.org/api/v2/verify/{app_id}` |
| Gate scan demo | **qrcode** (generate) + **html5-qrcode** (scan) | Scene 4 |
| Env/keys | **dotenv** | Never commit keys |
| ENS (optional, Tier 2) | **viem** (resolution) or **Namestone** (subnames) | NOTE: ENS lives on Ethereum (Sepolia testnet) — a separate chain interaction |

Install: `npm i @hashgraph/sdk @worldcoin/idkit qrcode html5-qrcode dotenv`

---

## 2. Account model (custodial)

- **Operator/treasury** = your portal account. Pays fees, holds minted tickets, is the royalty fee collector.
- **User accounts** = created by your backend per signup, keys stored encrypted in your DB.
- Create users with **auto-association slots** so they can receive a ticket without a separate associate step.

```js
import { Client, PrivateKey, AccountId, AccountCreateTransaction, Hbar } from "@hashgraph/sdk";

const client = Client.forTestnet();
client.setOperator(
  AccountId.fromString(process.env.OPERATOR_ID),
  PrivateKey.fromStringECDSA(process.env.OPERATOR_KEY)
);

async function createUserAccount() {
  const userKey = PrivateKey.generateECDSA();
  const tx = await new AccountCreateTransaction()
    .setKeyWithoutAlias(userKey.publicKey) // older SDKs: .setKey(userKey.publicKey)
    .setInitialBalance(new Hbar(1))
    .setMaxAutomaticTokenAssociations(100) // receive tickets without explicit associate
    .execute(client);
  const accountId = (await tx.getReceipt(client)).accountId;
  // STORE accountId + userKey (encrypted) in DB
  return { accountId, userKey };
}
```

---

## 3. THE SPINE — build this first (hours 0–6)

Goal: one ticket minted with a royalty fee, then an atomic NFT-for-HBAR sale where the royalty
visibly lands in the issuer account. Nothing else until this works.

### 3a. Create the ticket token (NFT) with a royalty + compliance keys

```js
import {
  TokenCreateTransaction, TokenType, TokenSupplyType,
  CustomRoyaltyFee, CustomFixedFee, Hbar, PrivateKey
} from "@hashgraph/sdk";

const supplyKey  = PrivateKey.generateECDSA(); // mint authority
const freezeKey  = PrivateKey.generateECDSA(); // compliance: freeze (optional)
const kycKey     = PrivateKey.generateECDSA(); // compliance: KYC gate (optional)

const royalty = new CustomRoyaltyFee()
  .setNumerator(10)            // 10%
  .setDenominator(100)
  .setFeeCollectorAccountId(operatorId)             // issuer earns the cut
  .setFallbackFee(new CustomFixedFee().setHbarAmount(new Hbar(5))); // if NFT moves with no payment

const create = await new TokenCreateTransaction()
  .setTokenName("WorldCup Ticket")
  .setTokenSymbol("WCT")
  .setTokenType(TokenType.NonFungibleUnique)
  .setSupplyType(TokenSupplyType.Finite)
  .setMaxSupply(10000)
  .setTreasuryAccountId(operatorId)
  .setSupplyKey(supplyKey)
  .setFreezeKey(freezeKey)     // optional — only if you gate transfers
  .setKycKey(kycKey)           // optional — only if you KYC-gate
  .setCustomFees([royalty])
  .execute(client);            // operator (treasury) auto-signs

const tokenId = (await create.getReceipt(client)).tokenId;
```

Royalty effect on a sale: buyer pays the price, the network skims 10% to the fee collector
(issuer), seller receives the rest. The fallback fee stops "gift it for free, pay cash off-ledger"
evasion. (It does NOT cap price — see the README pitch framing: "organizer earns on resale".)

### 3b. Mint a ticket

NFT metadata is capped at ~100 bytes, so store a *pointer* (URL/IPFS/HCS id), not full data.

```js
import { TokenMintTransaction } from "@hashgraph/sdk";

const mint = await new TokenMintTransaction()
  .setTokenId(tokenId)
  .setMetadata([Buffer.from("ticket://USA-match/sec114/row7")]) // pointer string
  .freezeWith(client)
  .sign(supplyKey);
const serial = (await (await mint.execute(client)).getReceipt(client)).serials[0];
```

### 3c. (If KYC-gated) grant KYC before an account can hold the ticket

```js
import { TokenGrantKycTransaction } from "@hashgraph/sdk";
await (await new TokenGrantKycTransaction()
  .setAccountId(userId).setTokenId(tokenId)
  .freezeWith(client).sign(kycKey).execute(client)).getReceipt(client);
```

### 3d. The atomic sale — NFT one way, HBAR the other, in ONE transaction

This single transaction is what triggers the native royalty. Custodial = your backend holds both
keys and signs both legs.

```js
import { TransferTransaction, Hbar } from "@hashgraph/sdk";

const price = new Hbar(50);
let tx = await new TransferTransaction()
  .addNftTransfer(tokenId, serial, sellerId, buyerId)
  .addHbarTransfer(buyerId, price.negated())
  .addHbarTransfer(sellerId, price)
  .freezeWith(client)
  .sign(sellerKey);          // seller authorizes the NFT move
tx = await tx.sign(buyerKey); // buyer authorizes the HBAR
await (await tx.execute(client)).getReceipt(client);
```

### 3e. Prove the royalty landed (the demo money-shot)

```js
// before and after the sale, read the issuer balance via Mirror Node:
const r = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/accounts/${operatorId}`);
const { balance } = await r.json(); // show balance.balance increased by the royalty
```

**Checkpoint:** if 3a–3e work end to end by hour 6, you have a submittable Hedera Tokenization
project already. Everything below is layers.

---

## 4. Wrap it in a minimal app (hours 6–18)

Three screens, custodial accounts, simple DB:
- **Buy** — primary sale: transfer a minted ticket from treasury to the buyer's account. Record in DB as `acquisition = "primary"`.
- **My tickets** — query Mirror Node for the user's NFTs: `GET /api/v1/accounts/{id}/nfts?token.id={tokenId}`.
- **Resell** — atomic sale (3d) between two user accounts. Record buyer's `acquisition = "secondary"`.

Backend holds keys; each "action" is your API route building + signing the relevant transaction.

---

## 5. World ID + the secondary cap (hours 18–26)

This is what earns World ID Track B — the cap genuinely breaks without proof of human.

### 5a. Frontend widget

```jsx
import { IDKitWidget, VerificationLevel } from "@worldcoin/idkit";

<IDKitWidget
  app_id="app_xxx"            // from World developer portal
  action="buy-ticket"
  verification_level={VerificationLevel.Orb}
  onSuccess={() => {}}
  handleVerify={async (proof) => {
    await fetch("/api/verify", { method: "POST", body: JSON.stringify(proof) });
  }}
>
  {({ open }) => <button onClick={open}>Verify you're human</button>}
</IDKitWidget>
```

### 5b. Backend verification (required: must happen in backend or contract)

```js
// POST /api/verify
const { nullifier_hash, merkle_root, proof, verification_level } = body;
const res = await fetch(`https://developer.worldcoin.org/api/v2/verify/${APP_ID}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ nullifier_hash, merkle_root, proof, verification_level, action: "buy-ticket" }),
});
if (!res.ok) throw new Error("not a unique human");
// STORE nullifier_hash — this is the unique-per-human ID. Tie it to the user's account.
```

### 5c. The cap (backend logic, not on-chain)

```js
// before approving a SECONDARY purchase for a buyer:
const secondaryHeld = await db.count("tickets", {
  ownerNullifier: buyer.nullifier_hash,
  acquisition: "secondary",
});
if (secondaryHeld >= 50) throw new Error("Secondary purchase cap reached");
// else proceed with the atomic sale
```

The cap counts *per verified human* (nullifier), not per account — so a scalper can't dodge it by
spinning up fresh wallets. That dependency is exactly the World ID justification the track asks for.

---

## 6. Gate scan + ENS (hours 26–32)

- **Gate scan (Scene 4):** generate a QR encoding `{ tokenId, serial, ownerId }` with `qrcode`;
  scan with `html5-qrcode`; backend confirms via Mirror Node that `ownerId` still holds that serial,
  then marks it used in your DB. Green light = valid.
- **ENS (optional, Tier 2 pool):** write real ENS code (resolution or a subname for the event/holder).
  Remember ENS is on Ethereum — use Sepolia testnet via `viem`, or Namestone's API for subnames.
  This is a separate-chain add-on; only do it once Hedera + World ID are solid.

---

## 7. Polish + submit (hours 32–36)

- Stop building. Rehearse the 4-scene demo 3 times. Record a backup video (Hedera + World both
  require a ≤5-min demo video and a public GitHub repo).
- README must cover: setup, architecture, how the royalty flow works, how World ID is used and what
  breaks without it.
- Present at the ENS booth Sunday morning IF you did the ENS integration.

---

## If behind — cut in this order

1. Cut ENS (lose only a small pool share).
2. Cut the gate scan (lose a demo flourish, not a prize).
3. Cut World ID + cap (lose Track B, but Hedera Tokenization still stands alone).
4. Never cut the spine (section 3). If only the spine works, you still have a real submission.

---

## Optional extras for "extra points" (only if ahead)

- **HCS sale log** (second native service → also qualifies "No Solidity" Hedera track): post each
  sale to a Hedera Consensus Service topic as a tamper-proof audit trail.
- **USDC payment leg:** swap the HBAR transfer in 3d for native USDC on Hedera (requires associating
  the USDC token id). Enables the Blink funding layer.
