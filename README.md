# Hedera World Cup Ticket

Anti-scalp NFT tickets on Hedera testnet, with World ID proof-of-human and secure gate check-in.

Each ticket is an NFT with a **10% royalty** baked in at creation. Users verify with **World ID** to get a custodial Hedera wallet — one verified human maps to one account (Sybil protection). Secondary resales require the **buyer** to verify World ID again, with a configurable per-event secondary purchase cap.

**Gate check-in** uses a signed, expiring QR tied to the current NFT owner, Mirror Node verification, and a live World ID confirmation — so a seller cannot scan an old QR after reselling the ticket.

---

## Quick start

### 1. Install

```bash
npm install
cp .env.example .env   # or copy from a teammate
```

Fill in `.env`:

| Variable | Source |
|---|---|
| `OPERATOR_ID`, `OPERATOR_KEY` | [portal.hedera.com](https://portal.hedera.com) (testnet) |
| `WORLD_APP_ID`, `WORLD_RP_ID`, `WORLD_RP_SIGNING_KEY` | [developer.worldcoin.org](https://developer.worldcoin.org) |
| `WORLD_ACTION` | Action name in the portal (e.g. `ticket-onboarding`) |
| `NEXT_PUBLIC_*` | Same World ID values for the browser |
| `GATE_QR_SECRET` | Long random string — HMAC signing for ticket pass QR (**required for gate**) |
| `APP_BASE_URL` | Public URL of the app (for NFT metadata links) |
| `ADMIN_SECRET` | Secret for promoting accounts to organizer |
| `ORGANIZER_INVITE_CODE` | Required on `/onboard` when registering as organizer |
| `SECONDARY_PURCHASE_CAP` | Max secondary purchases per World ID per event (default `1`) |

Optional gate tuning:

| Variable | Default | Purpose |
|---|---|---|
| `GATE_PASS_EXPIRY_MINUTES` | `15` | Signed QR validity |
| `GATE_CHALLENGE_EXPIRY_MINUTES` | `3` | Time for holder to confirm World ID after scan |
| `NEXT_PUBLIC_GATE_PASS_REFRESH_MS` | `60000` | Client QR refresh interval |

Set `WORLD_ENVIRONMENT=production` and `NEXT_PUBLIC_WORLD_ENVIRONMENT=production` when testing with the real World App on a phone. Use `staging` + the [World ID Simulator](https://simulator.worldcoin.org) for local dev.

### 2. Run the app

```bash
npm run dev          # http://localhost:3000
npm run dev:https    # HTTPS — required for gate camera scanning on phone
```

Open `http://localhost:3000` (or the **Network** URL from the terminal when testing from a phone on the same Wi‑Fi). For gate QR scanning, use **`npm run dev:https`** and open `https://<your-ip>:3000`.

### 3. User flows

| Page | Purpose |
|---|---|
| `/login` | Returning users — World ID verify → restore existing wallet |
| `/onboard` | New users — pick ENS name, choose role; organizers need invite code |
| `/` | Marketplace — buy tickets at organizer **face value** (mint-on-buy) |
| `/listings` | Browse active resale listings |
| `/wallet` | My tickets, list for resale, bids, sales history |
| `/tickets/{tokenId}/{serial}` | **Ticket pass** — signed gate QR + World ID check-in |
| `/events` | Organizer — event list |
| `/events/{tokenId}` | Organizer — gate scanner, pause/resume, ticket registry |
| `/organizer` | Create collections (max supply + face value) |

**Session:** account ID is stored in browser `localStorage`. Use **Log out** in the nav to switch users on the same device.

---

## Gate check-in (venue)

Three layers prevent the **post-resale QR scam** (seller keeps an old screenshot and tries to enter before the buyer):

| Layer | What it does |
|---|---|
| **1. Signed pass + generation + expiry** | QR is an HMAC-signed JSON pass (`owner`, `gen`, `exp`). On every resale, `pass_generation` bumps — the previous holder's QR fails immediately. Passes expire after ~15 minutes. |
| **2. On-chain owner check** | At scan, the Mirror Node confirms the NFT serial is held by `ownerAccountId` in the pass — not just SQLite. |
| **3. World ID holder confirm** | Organizer scan creates a **pending challenge** only. Entry is granted when the **current holder** completes World ID on the **ticket pass page** (`/tickets/...`). World App opens automatically when a scan is detected. |

### Demo flow

1. **Buyer** opens **ticket pass** (`/tickets/{tokenId}/{serial}`) and keeps it on screen.
2. **Organizer** → **My Events** → event → **Scan ticket QR**.
3. Scanner validates the pass → shows *Waiting for holder to confirm with World ID…*
4. **Buyer's phone** — World App opens automatically on the ticket pass page.
5. On success: freeze on-chain + `used` status → both sides see check-in animation.

**Cancel:** While waiting, the organizer can tap **Cancel verification** (or close the scanner) to abort and scan the next fan.

**After resale:** Seller's old QR returns *Pass revoked — ticket was resold.*

**Wallet / pass:** World App opens automatically when scanned — works on **My Tickets** or the **ticket pass** page (no extra tap).

Direct check-in without a signed pass is disabled (`POST /api/tokens/{tokenId}/gate-scan` → 410).

---

## Pricing model

| Term | Who sets it | When |
|---|---|---|
| **Face value** | Organizer | At collection creation (`faceValueHbar`) |
| **Resale price** | Seller | When listing on `/wallet` or via bids |

- **Primary buy** uses the organizer's face value — buyers cannot choose the price.
- **Resale** uses the listing ask or accepted bid. The on-chain **10% royalty** is taken automatically.

There is no hard on-chain price cap on resales.

---

## How it works

### Accounts vs tokens

- **Account** (`0.0.xxxxx`) — a Hedera wallet. Holds **HBAR** and **NFT tickets**.
- **Token** (`0.0.yyyyy`) — an NFT **collection** definition. Does not hold HBAR.

On onboarding, the operator funds each new account with **60 HBAR** (enough to buy a ticket + pay network fees).

### Mint-on-buy (primary sale)

1. Organizer creates a collection with `maxSupply` and `faceValueHbar` — no pre-minted inventory.
2. Purchaser clicks **Buy** on the marketplace.
3. Backend mints one serial, runs an atomic transfer (NFT + HBAR), records `acquisition: primary`.

### Secondary sale (resale)

1. Seller lists on `/wallet` or accepts a bid on `/listings`.
2. Buyer confirms with World ID.
3. Atomic on-chain swap: NFT to buyer, HBAR to seller, 10% royalty to organizer.
4. Recorded as `acquisition: secondary`; `pass_generation` bumps so old gate QRs invalidate.

---

## Project layout

```
app/
├── page.jsx                              # Marketplace
├── login/, onboard/, wallet/, organizer/
├── listings/                             # Resale marketplace
├── events/, events/[tokenId]/            # Organizer gate + registry
├── tickets/[tokenId]/[serial]/           # Ticket pass (signed QR + gate confirm)
├── components/
│   ├── events/GateQrScanner.jsx          # Organizer camera scanner
│   ├── tickets/GateEntryConfirm.jsx      # Auto World ID on pass page
│   ├── tickets/TicketPassQr.jsx          # Signed QR display
│   └── world-id/WorldIdTrigger.jsx       # Shared IDKit v4 widget
└── api/
    ├── tickets/.../pass/                 # GET signed gate pass (holder only)
    ├── tickets/.../gate-challenge/       # Poll pending challenge (holder)
    ├── tickets/.../gate-challenge/confirm/  # World ID + freeze + used
    ├── tokens/.../gate-scan/initiate/    # Organizer scan → create challenge
    ├── gate-challenges/[id]/             # Poll challenge status
    └── gate-challenges/[id]/cancel/      # Organizer cancel → re-scan

src/
├── lib/gatePass.js                       # HMAC-signed v2 passes
├── gate/validatePass.js                  # Sig + DB gen + Mirror Node owner
├── db/gateChallenges.js                  # Pending / confirmed / cancelled
├── hedera/mirror.js                      # getNftOwner(), getHbarBalance()
├── hedera/venue.js                       # scanTicketAtGate(), reset
└── world/verifyProof.js                  # World ID verify (v4)
```

---

## CLI scripts

```bash
node scripts/01-check-balance.js
node scripts/02-create-token.js [maxSupply] [faceValueHbar] [name] [symbol]
node scripts/03-create-account.js                         # dev bypass (no World ID)
node scripts/05-primary-sale.js
node scripts/06-resale.js [serial] [priceHbar] [sellerId] [buyerId]
node scripts/07-scan-gate.js [serial]                     # CLI gate (bypasses World ID challenge)
node scripts/promote-organizer.js 0.0.xxxx
node scripts/reset-db.js
```

`scripts/04-mint.js` is deprecated — tickets are minted on purchase.

---

## Commands reference

| Command | What it does |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run dev:https` | HTTPS dev server (gate camera on phone) |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `node scripts/reset-db.js` | Wipe SQLite (fresh start) |

---

## Phone testing

- **World ID:** use `production` env + real World App, or `staging` + Simulator.
- **Gate camera:** run `npm run dev:https` and open `https://<your-lan-ip>:3000`. HTTP blocks camera access in Chrome.
- **Two users:** log out between seller/buyer/organizer steps, or use two phones.

Add your LAN IP to `allowedDevOrigins` in `next.config.js` if you see cross-origin warnings.

---

## Security

- **Testnet only.** Never commit `.env`, `state.json`, or `data/users.db`.
- `GATE_QR_SECRET` is server-only — never expose via `NEXT_PUBLIC_*`.
- `data/users.db` holds custodial private keys and World ID nullifiers.
- Gate World ID confirm runs **only on the ticket pass page** (not a global wallet popup) to prevent remote approval scams.
- Rotate World ID signing keys if exposed.
