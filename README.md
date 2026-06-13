# Hedera World Cup Ticket

Anti-scalp NFT tickets on Hedera testnet, with World ID proof-of-human.

Each ticket is an NFT with a **10% royalty** baked in at creation. Users verify with **World ID** to get a custodial Hedera wallet — one verified human maps to one account (Sybil protection). Secondary resales require the **buyer** to verify World ID again, with a per-human secondary purchase cap.

---

## Quick start

### 1. Install

```bash
cd ~/Documents/Project/fake-repo
npm install
cp .env.example .env
```

Fill in `.env`:

| Variable | Source |
|---|---|
| `OPERATOR_ID`, `OPERATOR_KEY` | [portal.hedera.com](https://portal.hedera.com) (testnet) |
| `WORLD_APP_ID`, `WORLD_RP_ID`, `WORLD_RP_SIGNING_KEY` | [developer.worldcoin.org](https://developer.worldcoin.org) |
| `WORLD_ACTION` | Action name you create in the portal (e.g. `ticket-onboarding`) |
| `NEXT_PUBLIC_*` | Same World ID values for the browser |
| `APP_BASE_URL` | Public URL of the app (for NFT metadata links) |
| `ADMIN_SECRET` | Secret for promoting accounts to organizer |
| `ORGANIZER_INVITE_CODE` | Required on `/onboard` when registering as organizer (e.g. `FP2123`) |
| `SECONDARY_PURCHASE_CAP` | Max secondary purchases per World ID (default `1`) |

Set `WORLD_ENVIRONMENT=production` and `NEXT_PUBLIC_WORLD_ENVIRONMENT=production` when testing with the real World App on a phone. Use `staging` + the [World ID Simulator](https://simulator.worldcoin.org) for local dev.

### 2. Run the app

```bash
npm run dev
```

Open `http://localhost:3000` (or the **Network** URL from the terminal when testing from a phone on the same Wi‑Fi).

### 3. User flows

| Page | Purpose |
|---|---|
| `/login` | Returning users — World ID verify → restore existing wallet |
| `/onboard` | New users — pick a name (ENS), choose role; organizers need `ORGANIZER_INVITE_CODE` |
| `/` | Marketplace — buy tickets at organizer **face value** (mint-on-buy) |
| `/wallet` | My tickets — view ownership history, resell to another account |
| `/organizer` | Create collections (max supply + face value), view sold/remaining |

**Session:** account ID is stored in browser `localStorage`. Use **Log out** in the nav to switch users on the same device.

---

## Pricing model

| Term | Who sets it | When |
|---|---|---|
| **Face value** | Organizer | At collection creation (`faceValueHbar`) |
| **Resale price** | Seller (current ticket holder) | When listing on `/wallet` |

- **Primary buy** uses the organizer's face value — buyers cannot choose the price.
- **Resale** uses whatever the seller enters. The on-chain **10% royalty** is taken automatically from the resale price.

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

1. Seller goes to `/wallet`, enters **buyer account ID** and **resale price (HBAR)**.
2. Clicks **Resell** → buyer scans World ID.
3. Atomic on-chain swap: NFT to buyer, HBAR to seller, 10% royalty to organizer.
4. Recorded as `acquisition: secondary` (counts toward buyer's secondary cap).

---

## Project layout

```
fake-repo/
├── app/                              # Next.js 16 (UI + API)
│   ├── page.jsx                      # Marketplace
│   ├── login/page.jsx                # Returning user login
│   ├── onboard/page.jsx              # New wallet creation
│   ├── wallet/page.jsx               # My tickets + resale
│   ├── organizer/page.jsx            # Create collections
│   ├── components/Nav.jsx            # Nav + log out
│   └── api/
│       ├── login/                    # World ID → existing account
│       ├── verify-and-onboard/       # World ID → new account
│       ├── world-id/sign/            # RP signature for IDKit v4
│       ├── marketplace/              # List collections + face value
│       ├── tokens/                     # Create/list collections (organizer)
│       ├── tokens/[tokenId]/buy/     # Mint-on-buy primary purchase
│       ├── tickets/.../resell/       # Atomic resale + World ID
│       └── wallet/[accountId]/       # Tickets owned by account
├── src/
│   ├── client.js                     # Hedera testnet client
│   ├── state.js                      # state.json helpers (CLI scripts)
│   ├── db/                           # SQLite (data/users.db)
│   ├── world/verifyProof.js          # World ID verify (v4)
│   ├── lib/auth.js                   # Role checks
│   └── hedera/
│       ├── createToken.js            # NFT collection + royalty
│       ├── createAccount.js          # Custodial user account
│       ├── mintTicket.js             # Mint serials
│       ├── primaryPurchase.js        # Mint + primary sale
│       └── transferTicket.js         # Primary sale + atomic resale
├── scripts/                          # CLI runners (dev/demo)
├── data/users.db                     # gitignored
├── state.json                        # gitignored
└── .env                              # gitignored
```

---

## CLI scripts

```bash
node scripts/01-check-balance.js                          # operator HBAR balance
node scripts/02-create-token.js [maxSupply] [faceValueHbar] [name] [symbol]
node scripts/03-create-account.js                         # dev bypass (no World ID)
node scripts/05-primary-sale.js                           # mint-on-buy via CLI
node scripts/06-resale.js [serial] [priceHbar] [sellerId] [buyerId]
node scripts/promote-organizer.js 0.0.xxxx                # promote account to organizer
node scripts/reset-db.js                                  # delete data/users.db
```

`scripts/04-mint.js` is deprecated — tickets are minted on purchase, not in batch.

---

## Commands reference

| Command | What it does |
|---|---|
| `npm run dev` | Start Next.js dev server (UI + API) |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `node scripts/reset-db.js` | Wipe SQLite (fresh start) |

---

## Phone testing

Use the **Network** URL from the terminal (e.g. `http://172.16.0.174:3000`). If you see a cross-origin warning, add your IP to `allowedDevOrigins` in `next.config.js`.

For resale demos you need two World ID identities (two phones) or log out and switch accounts between seller and buyer steps.

---

## Security

- **Testnet only.** Never commit `.env`, `state.json`, or `data/users.db`.
- `data/users.db` holds custodial private keys and World ID nullifiers.
- `state.json` holds token supply/admin keys for CLI scripts.
- Rotate World ID signing keys if exposed.
