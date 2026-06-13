# Hedera World Cup Ticket — Hackathon Onboarding

**ETHGlobal New York 2026** · anti-scalp NFT tickets on Hedera

---

## 1. What this is

Each World Cup ticket is an NFT on Hedera. When the organizer creates a collection they bake in a **10% royalty fee**: every time the NFT moves in an atomic swap (NFT transferred in exchange for HBAR in the same transaction), the organizer gets 10% of the sale price automatically and without any app-level code. Authenticity is cryptographically guaranteed — no counterfeits.

**Mint-on-buy:** tickets are not pre-minted. The organizer sets `maxSupply` and **face value** only. When a purchaser buys, the backend mints one serial and transfers it in the same flow.

**World ID gates:**
- **Onboarding / login** — one nullifier → one Hedera account (Sybil protection at signup).
- **Secondary purchase** — buyer must verify World ID; nullifier stored with per-event secondary cap (`SECONDARY_PURCHASE_CAP`).
- **Gate check-in** — holder must verify World ID on the **ticket pass page** after organizer scans a signed QR; nullifier must match the account owner.

**Gate anti-scam (post-resale):** Without this, a seller could keep a QR screenshot after reselling and scan at the gate before the buyer. Three layers block that:
1. **Signed pass + `pass_generation` + expiry** — old owner QR fails immediately after resale; passes expire (~15 min).
2. **Mirror Node** — on-chain NFT owner must match pass `ownerAccountId`.
3. **Live World ID on pass page** — challenge/confirm flow; World App auto-opens when scan detected. Confirm is **not** shown globally on wallet (prevents buyer-at-home approving seller-at-gate).

**What this is NOT:** there is no hard on-chain price cap on resales. The royalty and the World ID cap together create strong disincentives for scalping, but a determined buyer can still overpay once. That framing matters for the pitch.

---

## 2. Prize targets

| Prize | Track | Why we qualify |
|---|---|---|
| Hedera Tokenization | $3,000 — anchor | Custom fees / royalties, NFT mint, on-chain transfer, Mirror Node gate verify |
| World ID Track B | $2,500 | Onboarding + login + resale + **gate check-in** require World ID; nullifier enforces one wallet + secondary cap |
| ENS pool | Small bolt-on | ENS subdomain as a human-readable ticket address |
| Hedera No-Solidity | $3,000 — fallback | HCS used as an audit log (second native Hedera service, zero Solidity) |

---

## 3. Tech stack

- **Runtime:** Node.js, ES modules (`"type": "module"` in package.json)
- **App:** Next.js 16 (App Router) — single server for UI + API routes
- **Hedera SDK:** `@hashgraph/sdk` v2.81+
- **Network:** Hedera testnet (custodial accounts, operator pays all fees)
- **Payment:** HBAR for the core sale; USDC planned later
- **Proof of human:** `@worldcoin/idkit` v4 — IDKit widget + backend verify via `/api/v4/verify/{rp_id}`
- **Gate QR:** `react-qr-code` (holder pass) + `html5-qrcode` (organizer scanner)
- **Database:** SQLite (`better-sqlite3`) — users, tokens, tickets, ownership, listings, gate_challenges in `data/users.db`

> **SDK name trap:** The Hedera Playground and older snippets use `@hiero-ledger/sdk`. This repo uses `@hashgraph/sdk`. The API is identical; only the import changes. Don't mix them.

---

## 4. Architecture & conventions

```
app/
  page.jsx                              ← Marketplace (mint-on-buy at face value)
  listings/page.jsx                     ← Public resale listings + bids
  login/page.jsx                        ← Returning user: World ID → existing account
  onboard/page.jsx                      ← New user: World ID → create account + role + ENS
  wallet/page.jsx                       ← My tickets, listings, bids, sales history
  tickets/[tokenId]/[serial]/page.jsx   ← Ticket pass: signed QR + auto World ID gate confirm
  events/page.jsx                       ← Organizer event list
  events/[tokenId]/page.jsx             ← Gate scanner, pause/resume, ticket registry
  organizer/page.jsx                    ← Create collections (maxSupply + faceValueHbar)
  gate/[tokenId]/[serial]/page.jsx      ← Legacy URL fallback → redirect to event scanner
  components/
    events/GateQrScanner.jsx            ← Camera scanner + processing overlay + cancel
    events/EventCompliancePanel.jsx     ← Initiate scan, poll challenge, cancel
    tickets/TicketPassQr.jsx            ← Fetches signed pass from API
    tickets/GateEntryConfirm.jsx        ← Polls challenge, auto-opens World ID
    tickets/GateChallengeAlert.jsx      ← Wallet banner → link to pass page
    world-id/WorldIdTrigger.jsx         ← Shared IDKit v4 (rp_context, autoStart)
  lib/gate.js                           ← parseGateScanPayload (v2 signed pass)
  api/
    login/route.js
    verify-and-onboard/route.js
    world-id/sign/route.js              ← RP signature for IDKit v4
    marketplace/route.js
    listings/                           ← CRUD + bids
    tokens/route.js
    tokens/[tokenId]/buy/route.js
    tokens/[tokenId]/gate-scan/initiate/route.js  ← Validate pass + create challenge
    tokens/[tokenId]/gate-scan/route.js           ← 410 — direct scan disabled
    tickets/[tokenId]/[serial]/pass/route.js      ← GET signed pass (holder only)
    tickets/[tokenId]/[serial]/gate-challenge/route.js       ← Holder poll pending
    tickets/[tokenId]/[serial]/gate-challenge/confirm/route.js  ← World ID + freeze
    gate-challenges/[challengeId]/route.js      ← Status poll (organizer + holder)
    gate-challenges/[challengeId]/cancel/route.js ← Organizer cancel
    tickets/[tokenId]/[serial]/resell/
    wallet/[accountId]/route.js

src/
  client.js
  state.js
  lib/
    auth.js
    gatePass.js                         ← HMAC v2 pass create/verify/encode
  gate/
    validatePass.js                     ← Sig + DB gen + Mirror owner
  db/
    schema.sql                          ← + pass_generation, gate_challenges
    gateChallenges.js
    users.js, tokens.js, tickets.js, listings.js, db.js
  world/
    verifyProof.js
  hedera/
    createToken.js, createAccount.js, mintTicket.js
    primaryPurchase.js, transferTicket.js, settleResale.js
    compliance.js, venue.js             ← scanTicketAtGate, reset
    mirror.js                           ← getNftOwner, getHbarBalance

scripts/
  01-check-balance.js
  02-create-token.js
  03-create-account.js
  04-mint.js                            ← DEPRECATED
  05-primary-sale.js
  06-resale.js
  07-scan-gate.js                       ← CLI gate (bypasses World ID challenge — dev only)
  08-pause-match.js
  09-unfreeze.js
  promote-organizer.js
  reset-db.js
  setup-dev-https.js                    ← Local certs for npm run dev:https
```

**Rule:** `src/hedera/` functions are pure — no `console.log`, no `process.env` reads, they close the Hedera client before returning. Scripts and API routes are the runners.

**`state.json`** — local store for CLI scripts. Holds `tokenId`, token keys, latest `buyer`. Gitignored.

**`data/users.db`** — SQLite for all app state. Gitignored. Contains custodial private keys — treat as secrets even on testnet.

---

## 5. User roles

| Role | How assigned | Can do |
|---|---|---|
| `organizer` | Selected on `/onboard` (invite code) or promoted via `ADMIN_SECRET` | Create collections, receive primary sale HBAR + royalties, scan at gate |
| `purchaser` | Default on onboard | Buy tickets at face value |
| `reseller` | Auto-promoted after first primary purchase | Resell owned tickets, list on marketplace |

Operator account (`OPERATOR_ID`) is auto-seeded as `organizer` on first DB init.

---

## 6. Pricing

| Term | Set by | Stored in | Used for |
|---|---|---|---|
| **Face value** | Organizer at collection creation | `tokens.primary_price_hbar` | Primary marketplace buy |
| **Resale price** | Seller on `/wallet` or bid flow | `ownership.price_hbar` on secondary transfer | Fan-to-fan resales |

Primary buy API ignores any client-sent price — always uses `token.primary_price_hbar`.

---

## 7. Accounts vs tokens (HBAR)

- **Account** — Hedera wallet (`0.0.xxxxx`). Holds HBAR balance and NFT serials.
- **Token** — NFT collection ID (`0.0.yyyyy`). A definition only; does not hold HBAR.

On onboarding, `createUserAccount(60)` transfers 60 HBAR from the **operator** into the new user's account (starter funds for fees + one ticket purchase). Token creation only pays a small network fee — no 60 HBAR transfer.

---

## 8. Auth & session

Browser session = `localStorage` key `ticket_account_id`. Not server-side sessions.

| Flow | Endpoint | Result |
|---|---|---|
| **Create wallet** | `POST /api/verify-and-onboard` | New Hedera account if nullifier unseen; 409 → use login |
| **Log in** | `POST /api/login` | Restore existing account by nullifier; 404 if never onboarded |
| **Log out** | Nav button | Clears localStorage → `/login` |

World ID ties one human to one account permanently. Log out only clears the browser; the same person logging in again gets the same account.

---

## 9. Sale flows

### Primary (mint-on-buy)

```
Purchaser → POST /api/tokens/{tokenId}/buy
  → primaryPurchase()
    → mintTickets(1 serial)
    → primarySale(NFT + HBAR at face value)
    → DB: status sold_primary, acquisition primary
    → recordOwnership → bumpPassGeneration
```

Organizer treasury receives face-value HBAR. No royalty on primary sale (royalty is for resales).

### Secondary (resale / listings)

```
Seller lists on /wallet → buyer bids or buys via /listings
  → buyer World ID on confirm
  → atomicResale(NFT + HBAR in one TransferTransaction)
  → 10% royalty to organizer on-chain automatically
  → DB: status sold_secondary, acquisition secondary
  → recordOwnership → bumpPassGeneration (invalidates seller's gate QR)
```

---

## 10. Gate check-in flow

### Signed pass (holder)

```
Holder on /tickets/{tokenId}/{serial}
  → GET /api/tickets/{tokenId}/{serial}/pass  (must be current owner)
  → HMAC v2 JSON: { v, tokenId, serial, owner, gen, exp, sig }
  → QR refreshes before expiry (~15 min)
```

### Scan + confirm (organizer + holder)

```
Organizer → /events/{tokenId} → Scan ticket QR
  → parseGateScanPayload (v2 signed pass only — legacy URL QRs rejected)
  → POST /api/tokens/{tokenId}/gate-scan/initiate { pass }
      → validateGatePassForScan: sig, expiry, pass_generation, DB owner, Mirror Node owner
      → createGateChallenge (pending, ~3 min TTL)
  → poll GET /api/gate-challenges/{challengeId} until confirmed

Holder ticket pass page (must be open, logged in as owner):
  → poll GET /api/tickets/{tokenId}/{serial}/gate-challenge
  → WorldIdTrigger autoStart → World App opens
  → POST /api/tickets/{tokenId}/{serial}/gate-challenge/confirm { challengeId, proof }
      → verifyWorldIdProof + nullifier === holder.nullifier_hash
      → scanTicketAtGate (freeze holder + status used)
      → confirmGateChallenge

Organizer sees success overlay; holder sees check-in animation.
```

### Cancel / retry

- Organizer: **Cancel verification** in scanner overlay, or **Close** scanner → `POST /api/gate-challenges/{id}/cancel`
- Holder: challenge cleared; wallet banner disappears; organizer can re-scan
- If World ID fails: small **Retry World ID** link on pass page (auto-open again)

### Anti-scam properties

| Attack | Blocked by |
|---|---|
| Seller uses old QR after resale | `pass_generation` bump → "Pass revoked" |
| Forged QR | HMAC signature without `GATE_QR_SECRET` |
| Stale screenshot | Pass `exp` timestamp |
| QR doesn't match on-chain holder | Mirror Node `getNftOwner` |
| Seller approves from buyer's account remotely | World ID confirm only on pass page session; nullifier must match owner |

---

## 11. Key Hedera facts

- **Token keys are permanent.** All keys (admin, supply, freeze, pause, metadata) must be set at creation time.
- **NFT initial supply must be 0.** `setInitialSupply(0)` required for `NonFungibleUnique`.
- **NFT metadata ≤100 bytes.** Short pointer URL only (e.g. `/api/tickets/{tokenId}/{serial}`).
- **Royalty only fires on atomic swap.** NFT + HBAR in the same `TransferTransaction`. Plain NFT transfer triggers fallback fee (5 HBAR).
- **Mirror Node lags ~5 seconds.** Wait before querying after account creation or transfer.
- **Compliance layer:** Freeze is account-level, not per-serial — freezing a holder blocks transfer of *all* their tickets for that token. A frozen holder = entered/used = can't resell (`ACCOUNT_FROZEN_FOR_TOKEN`). Pause blocks the whole token (`TOKEN_IS_PAUSED`).

---

## 12. Environment variables

```env
OPERATOR_ID=0.0.xxxx
OPERATOR_KEY=0x...

WORLD_APP_ID=app_xxx
WORLD_RP_ID=rp_xxx
WORLD_RP_SIGNING_KEY=0x...
WORLD_ACTION=ticket-onboarding
WORLD_ENVIRONMENT=production

NEXT_PUBLIC_WORLD_APP_ID=app_xxx
NEXT_PUBLIC_WORLD_ACTION=ticket-onboarding
NEXT_PUBLIC_WORLD_ENVIRONMENT=production

# Gate pass signing — REQUIRED for ticket pass QR
GATE_QR_SECRET=long-random-string
GATE_PASS_EXPIRY_MINUTES=15
GATE_CHALLENGE_EXPIRY_MINUTES=3
NEXT_PUBLIC_GATE_PASS_REFRESH_MS=60000

APP_BASE_URL=http://localhost:3000
ADMIN_SECRET=change-me
ORGANIZER_INVITE_CODE=FP2123
SECONDARY_PURCHASE_CAP=1

LISTING_EXPIRY_HOURS=72
BID_EXPIRY_HOURS=24
HBAR_FEE_BUFFER=5

ENS_PARENT_NAME=fairpass.eth
NEXT_PUBLIC_ENS_PARENT_NAME=fairpass.eth
ENS_CHAIN_ID=11155111
ENS_RPC_URL=https://...
ENS_OPERATOR_KEY=0x...
```

For phone demos use `production`. For local dev use `staging` + World ID Simulator.

**Gate camera:** run `npm run dev:https` — Chrome blocks camera on plain HTTP.

---

## 13. Getting started

```bash
npm install
cp .env.example .env
# fill in .env — GATE_QR_SECRET is required for gate

npm run dev          # http://localhost:3000
npm run dev:https    # https://0.0.0.0:3000 — gate camera on phone
```

**Demo path (gate check-in):**
1. User A → `/onboard` → Organizer → `/organizer` → create collection
2. User B → `/onboard` → Purchaser → `/` → Buy
3. User B → `/tickets/{tokenId}/{serial}` → keep ticket pass open
4. User A → `/events/{tokenId}` → Scan ticket QR
5. User B's World App opens automatically → confirm → checked in

**Demo path (resale + gate):**
1. User B resells to User C via `/wallet` listings
2. User B's old QR fails at gate; User C's fresh QR works

**CLI alternative:**
```bash
node scripts/01-check-balance.js
node scripts/02-create-token.js 100 50 "World Cup Ticket" WCT
node scripts/03-create-account.js
node scripts/05-primary-sale.js
node scripts/06-resale.js 1 75 0.0.seller 0.0.buyer
node scripts/07-scan-gate.js 1                          # bypasses World ID challenge
node scripts/promote-organizer.js 0.0.xxxx
node scripts/reset-db.js
```

---

## 14. Status & next steps

**Done**
- [x] Hedera client, state helpers, SQLite schema (users, tokens, tickets, ownership, listings)
- [x] World ID onboarding + login + logout
- [x] Roles: organizer / purchaser / reseller
- [x] Token creation with 10% royalty + organizer face value
- [x] Mint-on-buy primary sales at face value
- [x] Resale listings marketplace + bids + World ID on buyer + per-event secondary cap
- [x] ENS subdomain on onboard
- [x] Marketplace, wallet, organizer, events UI
- [x] **Gate security:** signed QR + pass_generation + Mirror Node + World ID challenge/confirm
- [x] Organizer gate scanner (HTTPS), cancel verification, holder auto World ID
- [x] CLI scripts 01–03, 05–09, promote-organizer, reset-db, setup-dev-https

**Up next**
1. HCS audit log — every ticket event on a Consensus Service topic (No-Solidity prize)
2. Push notification when gate challenge created (optional — banner + auto-open covers MVP)
3. USDC payment option

---

## 15. Security

- **Testnet only.** Never use mainnet keys in this codebase.
- **Never commit `.env`.** Operator key, World ID signing key, admin secret, `GATE_QR_SECRET` stay server-side.
- **`data/users.db` is gitignored.** Custodial private keys for all users. Do not commit.
- **`state.json` is gitignored.** Token supply/admin keys for CLI. Losing it means you cannot mint more for that token.
- **`WORLD_RP_SIGNING_KEY` and `GATE_QR_SECRET` are server-only.** Never expose via `NEXT_PUBLIC_*`.
- Gate World ID confirm is scoped to the **ticket pass page** — do not add global wallet confirm (remote approval risk).
- For phone testing, add LAN IP to `allowedDevOrigins` in `next.config.js`.
