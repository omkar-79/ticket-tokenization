CREATE TABLE IF NOT EXISTS users (
  nullifier_hash TEXT PRIMARY KEY,
  account_id     TEXT NOT NULL UNIQUE,
  private_key    TEXT NOT NULL,
  ens_name       TEXT,
  ens_label      TEXT UNIQUE,
  ens_records_json TEXT,
  role           TEXT NOT NULL DEFAULT 'purchaser',
  created_at     TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tokens (
  token_id             TEXT PRIMARY KEY,
  organizer_account_id TEXT NOT NULL,
  name                 TEXT NOT NULL,
  symbol               TEXT NOT NULL,
  max_supply           INTEGER NOT NULL,
  primary_price_hbar   REAL NOT NULL DEFAULT 50,
  minted_count         INTEGER NOT NULL DEFAULT 0,
  royalty_numerator    INTEGER NOT NULL DEFAULT 10,
  royalty_denominator  INTEGER NOT NULL DEFAULT 100,
  keys_json            TEXT NOT NULL,
  paused               INTEGER NOT NULL DEFAULT 0,
  created_at           TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tickets (
  token_id       TEXT NOT NULL,
  serial         INTEGER NOT NULL,
  metadata_uri   TEXT NOT NULL,
  metadata_json  TEXT,
  ens_name       TEXT UNIQUE,
  status         TEXT NOT NULL DEFAULT 'minted',
  PRIMARY KEY (token_id, serial),
  FOREIGN KEY (token_id) REFERENCES tokens(token_id)
);

CREATE TABLE IF NOT EXISTS ownership (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  token_id         TEXT NOT NULL,
  serial           INTEGER NOT NULL,
  owner_account_id TEXT NOT NULL,
  owner_nullifier  TEXT,
  acquisition      TEXT NOT NULL,
  price_hbar       REAL,
  tx_id            TEXT,
  acquired_at      TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (token_id, serial) REFERENCES tickets(token_id, serial)
);

CREATE INDEX IF NOT EXISTS idx_ownership_ticket ON ownership(token_id, serial);
CREATE INDEX IF NOT EXISTS idx_ownership_owner ON ownership(owner_account_id);

CREATE TABLE IF NOT EXISTS listings (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  token_id            TEXT NOT NULL,
  serial              INTEGER NOT NULL,
  seller_account_id   TEXT NOT NULL,
  ask_price_hbar      REAL NOT NULL,
  min_bid_hbar        REAL,
  status              TEXT NOT NULL DEFAULT 'open',
  expires_at          TEXT NOT NULL,
  created_at          TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (token_id, serial) REFERENCES tickets(token_id, serial)
);

CREATE TABLE IF NOT EXISTS bids (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id          INTEGER NOT NULL,
  bidder_account_id   TEXT NOT NULL,
  bid_price_hbar      REAL NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending',
  expires_at          TEXT NOT NULL,
  created_at          TEXT DEFAULT (datetime('now')),
  responded_at        TEXT,
  FOREIGN KEY (listing_id) REFERENCES listings(id)
);

CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller_account_id);
CREATE INDEX IF NOT EXISTS idx_bids_listing ON bids(listing_id, status);
CREATE INDEX IF NOT EXISTS idx_bids_bidder ON bids(bidder_account_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_active_ticket
  ON listings(token_id, serial)
  WHERE status IN ('open', 'pending_settlement');
