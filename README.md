# Fair Pass

Event tickets as Hedera NFTs with human-verified wallets, readable ENS names, and secure gate check-in.

Each ticket is minted on purchase , resold with an on-chain resell fee (royalty), and checked in at the venue via a signed QR that only the current holder can confirm with World ID.

---

## What we use 

### Hedera (`@hashgraph/sdk`, testnet)

We use **two native Hedera services** — no Solidity contracts:

- **HTS (Hedera Token Service)** — NFT collections, mint-on-buy, atomic swaps, royalties, freeze/pause compliance
- **HCS (Hedera Consensus Service)** — append-only audit log of ticket lifecycle events, linked to HTS transaction IDs

| Feature | How we use it |
|---|---|
| **NFT collections** | `TokenCreateTransaction` with `NonFungibleUnique`, finite `maxSupply`, `initialSupply: 0` |
| **Mint-on-buy** | `TokenMintTransaction` mints one serial when a fan purchases at face value |
| **Atomic swaps** | `TransferTransaction` moves NFT + HBAR in one tx (primary sale and fan resale) |
| **Royalty fees** | `CustomRoyaltyFee` (default 10%) paid to the organizer treasury on every secondary transfer; `CustomFixedFee` fallback if someone tries a plain NFT transfer |
| **Freeze (compliance)** | `TokenFreezeTransaction` on the holder account after gate check-in — they cannot transfer that token again |
| **Pause (compliance)** | `TokenPauseTransaction` / `Unpause` lets organizers halt an entire event collection |
| **Token keys** | Admin, supply, freeze, pause, and metadata keys set at creation and stored in SQLite for operator-signed actions |
| **Mirror Node** | REST queries to confirm live NFT owner and HBAR balance (gate validation, wallet UI) |
| **HCS audit log** | After each successful HTS action, the backend submits compact JSON to one global topic via `TopicMessageSubmitTransaction` (operator `submitKey` only). Events: `collection_created`, `primary_sale`, `secondary_sale`, `gate_checkin`, `match_paused` / `match_resumed`. SQLite stays the live app DB; HCS is a tamper-proof public mirror — verify on [HashScan topic](https://hashscan.io/testnet/topic/0.0.9227030) or Mirror Node. |
| **Custodial accounts** | Operator creates and funds user accounts; signs txs on their behalf for demo UX |

**HCS setup (once):** run `node scripts/10-create-audit-topic.js` and set `HCS_AUDIT_TOPIC_ID` in `.env`. If unset, audit logging is skipped (dev-friendly).

**Lifecycle on testnet:** create collection → mint serial on buy → atomic resale (royalty auto-deducted) → freeze holder at gate — with each step optionally logged to HCS.

### World ID (`@worldcoin/idkit` v4)

Proof-of-human is a real constraint — the app breaks without it for signup, resale, and gate entry.

| Flow | What happens |
|---|---|
| **Onboarding** | New user verifies in World App → backend verifies proof via `/api/v4/verify/{rp_id}` → nullifier stored → one Hedera account created per human |
| **Login** | Same action + nullifier lookup → restores existing wallet (Sybil-resistant signup) |
| **Secondary purchase** | Buyer must verify before confirming a bid or direct resale; nullifier checked against per-event secondary cap |
| **Gate check-in** | Organizer scan creates a challenge; **current holder** confirms on the ticket pass page — World App opens automatically; proof verified server-side before freeze |
| **RP signing** | `POST /api/world-id/sign` returns an RP signature for IDKit v4 (`rp_context`, legacy proofs enabled) |

Use `WORLD_ENVIRONMENT=staging` + the [World ID Simulator](https://simulator.worldcoin.org) locally. Use `production` when testing with the real World App on a phone.

### ENS (Sepolia, `viem`)

Custom code — not a wallet-connect shortcut. We register subnames under a parent domain you control (e.g. `fairpass.eth`).

| Integration | What happens |
|---|---|
| **User identity** | On onboard, user picks a label → `setSubnodeRecord` on ENS Name Wrapper → `setText` with `hedera.account_id` |
| **Ticket identity** | On primary mint, a subname like `jazz-day-0-0-9226502-1.fairpass.eth` is created with `hedera.owner_account_id` |
| **Resale update** | After secondary transfer, ticket text record updates to the new owner |
| **Resolution** | Backend resolves ENS labels to Hedera account IDs for display; nav, marketplace, and ownership history show names instead of raw `0.0.xxxxx` |
| **Availability** | Checked on-chain (registry) and in-app before registration |

ENS is optional — leave `ENS_*` unset and the app falls back to Hedera account IDs everywhere.

---


### HashScan (Hedera testnet explorer)

| What | URL |
|---|---|
| **Operator account** | `https://hashscan.io/testnet/account/0.0.9185833` |
| **Organizer account** | `https://hashscan.io/testnet/account/0.0.9226476` |
| **NFT collection — Jazz Day** | `https://hashscan.io/testnet/token/0.0.9226502` |
| **NFT collection — Rock Day** | `https://hashscan.io/testnet/token/0.0.9228809` |
| **Specific ticket serial** | `https://hashscan.io/testnet/token/0.0.9226502?type=nft&serial=1` |
| **Primary sale tx** | `https://hashscan.io/testnet/transaction/0.0.9185833@1781414269.265688337` |
| **Resale tx** | `https://hashscan.io/testnet/transaction/0.0.9185833@1781413914.542150194` |
| **HCS audit topic** | `https://hashscan.io/testnet/topic/0.0.9227030` |


### ENS (Sepolia)

| What | URL |
|---|---|
| **User name** | `https://app.ens.domains/jim.fairpass.eth` |
| **Ticket name** | `https://app.ens.domains/jazz-day-0-0-9226502-1.fairpass.eth` |
| **User subname create tx** | `https://sepolia.etherscan.io/tx/0x79fc3f2941927c9d3c79b333667dffc4360c81862dff3412e529131a7faad632` |
| **User resolver `setText` tx** | `https://sepolia.etherscan.io/tx/0x60ff431369e6b5ea9b54fe36790e172c1ae6e438eef36bee5b15d217711cc854` |
| **Ticket subname create tx** | `https://sepolia.etherscan.io/tx/0x6d7788afc2c2e9a8f6f2d5ee7c37100915d9ed368aa08676c05bc7c3116a4cb7` |
| **Ticket resolver `setText` tx** | `https://sepolia.etherscan.io/tx/0x3025e315af3c9429ed2c1f740e261e1c0465b63a8fc86a7ff8fa2f75a118d82b` |

Each ENS name uses two on-chain steps: `setSubnodeRecord` on the NameWrapper, then `setText` on the public resolver. Tx hashes are returned in onboard/buy API responses as `ens.txHashes` but are not stored in SQLite.

### World ID

| What | URL |
|---|---|
| **Developer portal** | https://developer.worldcoin.org |
| **Local simulator** | https://simulator.worldcoin.org |
| **Verify API docs** | https://docs.world.org/world-id/reference/api-v4 |
| **Verify API (server, production)** | `POST https://developer.world.org/api/v4/verify/rp_6e6f4b926145751e` |
| **Verify API (server, staging)** | `POST https://staging-developer.worldcoin.org/api/v4/verify/rp_6e6f4b926145751e` |

The verify URL is **not a browser link**. It only accepts `POST` with the IDKit proof JSON from your backend (`src/world/verifyProof.js`). Opening it in a tab returns 405. Example: `POST .../api/v4/verify/rp_6e6f4b926145751e` with an empty body returns 400 (`action is required`), which confirms the host is up.

---

## Installation

### Prerequisites

- **Node.js 20+**
- **Hedera testnet account** with HBAR ([portal.hedera.com](https://portal.hedera.com))
- **World ID app** with an action and RP configured ([developer.worldcoin.org](https://developer.worldcoin.org))
- **ENS parent on Sepolia** (optional) — you must own the parent name and fund an operator key with Sepolia ETH

### 1. Clone and install

```bash
git clone https://github.com/omkar-79/ticket-tokenization.git
cd ticket-tokenization
npm install
```

### 2. Environment

Copy the example file, it has test env values (which makes it faster to run locally):

```bash
cp .env.example .env
```
Comments in `.env.example` explain each group (Hedera, World ID, ENS, gate). **Never commit `.env`.**

Minimum to run locally:

- `OPERATOR_ID`, `OPERATOR_KEY`
- `WORLD_*` and `NEXT_PUBLIC_WORLD_*`
- `GATE_QR_SECRET` (any long random string)
- `APP_BASE_URL`, `ADMIN_SECRET`, `ORGANIZER_INVITE_CODE`


### 3. Start the app

```bash
npm run dev          # http://localhost:3000
npm run dev:https    # HTTPS — needed for gate camera on a phone
```

First boot creates `data/users.db` and seeds the operator as organizer.

### 4. Demo path (two users, one phone + laptop)

1. **Organizer** → `/onboard` → pick ENS label → role **Organizer** (needs invite code) → `/events` → create event (face value e.g. 40 HBAR)
2. **Fan A** → `/onboard` → **Purchaser** → `/` → buy ticket
3. **Fan A** → `/wallet` → list for resale OR **Fan B** bids on `/listings`
4. **Fan B** → World ID confirm → atomic resale (check HashScan for royalty line item)
5. **Organizer** → `/events/{tokenId}` → **Scan ticket QR** → **Fan B** confirms on ticket pass page

Use **Log out** in the nav to switch users on one device.

### 5. Reset local state

```bash
node scripts/reset-db.js   # wipes SQLite; restart dev server to re-seed operator
```

---

## User flows

| Page | Purpose |
|---|---|
| `/login` | Returning users — World ID → existing wallet |
| `/onboard` | New users — ENS label + role (organizer needs invite code) |
| `/` | Marketplace — buy at face value (mint-on-buy) |
| `/listings` | Browse resale listings and place bids |
| `/wallet` | Tickets, list for resale, bids, sales history |
| `/tickets/{tokenId}/{serial}` | Ticket pass — signed gate QR + World ID check-in |
| `/events` | Organizer — create and manage events |
| `/events/{tokenId}` | Gate scanner, pause/resume, ticket registry |

Session = `localStorage` key `ticket_account_id`. Log out to switch accounts.

---

## Gate check-in

Three layers stop the **post-resale QR scam** (seller keeps an old screenshot):

| Layer | Mechanism |
|---|---|
| **Signed pass** | HMAC JSON (`owner`, `gen`, `exp`). `pass_generation` bumps on every resale — old QRs fail immediately. |
| **Mirror Node** | Scan validates NFT owner on-chain, not only in SQLite. |
| **World ID confirm** | Organizer scan creates a pending challenge; only the **current holder** completes World ID on the ticket pass page. |

**Demo:** buyer opens ticket pass → organizer scans → World App opens on buyer's phone → freeze + `used` status.

Direct check-in without a signed pass is disabled (`POST .../gate-scan` → 410).

---

## Pricing

| Term | Set by | Used for |
|---|---|---|
| **Face value** | Organizer at creation | Primary marketplace buy |
| **Ask / bid** | Seller / buyer | Secondary marketplace |

Primary buy always uses `primary_price_hbar` from the server. Resales use listing price; **10% royalty** to organizer is enforced on-chain on atomic transfer.

---

## Project layout

```
app/
├── page.jsx, wallet/, listings/, events/, tickets/
├── components/nav/          # Fair Pass branding, HBAR balance
├── components/tickets/      # TicketPassQr, GateEntryConfirm, OwnershipHistory
├── components/world-id/     # WorldIdTrigger (IDKit v4)
└── api/
    ├── verify-and-onboard/, login/     # World ID + Hedera account
    ├── tokens/                          # HTS collection + buy
    ├── tickets/.../pass/                # Signed gate QR
    ├── tickets/.../gate-challenge/      # Holder World ID confirm
    └── tokens/.../gate-scan/initiate/   # Organizer scan

src/
├── hedera/                  # createToken, mint, transfer, compliance, mirror
├── ens/                     # provision, resolve, identity text records
├── world/verifyProof.js     # World ID v4 backend verify
├── lib/gatePass.js          # HMAC-signed passes
└── gate/validatePass.js     # Sig + generation + Mirror Node owner
```

---

## CLI scripts (testnet)

Run after the app has started once (operator seeded in DB):

```bash
node scripts/01-check-balance.js
node scripts/10-create-audit-topic.js              # once — HCS audit log topic
node scripts/02-create-token.js 100 50 "Jazz Day" JD
node scripts/03-create-account.js              # dev bypass — no World ID
node scripts/05-primary-sale.js
node scripts/06-resale.js 1 75 0.0.SELLER 0.0.BUYER
node scripts/07-scan-gate.js 1                   # CLI gate (skips World ID challenge)
node scripts/promote-organizer.js 0.0.xxxx
node scripts/reset-db.js
```

---

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Dev server |
| `npm run dev:https` | HTTPS dev server (gate camera on phone) |
| `npm run build` | Production build |
| `npm run start` | Run production build |

---

## Phone testing

- **World ID:** `production` env + real World App, or `staging` + Simulator
- **Gate camera:** `npm run dev:https` → `https://<lan-ip>:3000` (HTTP blocks camera in Chrome)
- Add LAN IP to `allowedDevOrigins` in `next.config.js` if needed

---

## Security

- **Testnet only** — do not use mainnet keys
- Never commit `.env`, `state.json`, or `data/users.db`
- `WORLD_RP_SIGNING_KEY`, `GATE_QR_SECRET`, and `ENS_OPERATOR_KEY` are server-only — no `NEXT_PUBLIC_*`
- `data/users.db` holds custodial private keys and World ID nullifiers
- Gate World ID runs on the **ticket pass page** only (prevents remote approval scams)
