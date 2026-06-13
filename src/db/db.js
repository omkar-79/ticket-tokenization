import Database from "better-sqlite3";
import { readFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DB_PATH = join(__dirname, "../../data/users.db");

let db;

function runMigrations(database) {
  const userCols = database.prepare("PRAGMA table_info(users)").all();
  if (!userCols.find((c) => c.name === "role")) {
    database.exec(
      "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'purchaser'"
    );
  }
  if (!userCols.find((c) => c.name === "ens_name")) {
    database.exec("ALTER TABLE users ADD COLUMN ens_name TEXT");
  }
  if (!userCols.find((c) => c.name === "ens_label")) {
    database.exec("ALTER TABLE users ADD COLUMN ens_label TEXT");
  }
  if (!userCols.find((c) => c.name === "ens_records_json")) {
    database.exec("ALTER TABLE users ADD COLUMN ens_records_json TEXT");
  }

  const ticketCols = database.prepare("PRAGMA table_info(tickets)").all();
  if (ticketCols.length > 0 && !ticketCols.find((c) => c.name === "metadata_json")) {
    database.exec("ALTER TABLE tickets ADD COLUMN metadata_json TEXT");
  }
  if (ticketCols.length > 0 && !ticketCols.find((c) => c.name === "ens_name")) {
    database.exec("ALTER TABLE tickets ADD COLUMN ens_name TEXT");
  }

  const tokenCols = database.prepare("PRAGMA table_info(tokens)").all();
  if (tokenCols.length > 0 && !tokenCols.find((c) => c.name === "primary_price_hbar")) {
    database.exec(
      "ALTER TABLE tokens ADD COLUMN primary_price_hbar REAL NOT NULL DEFAULT 50"
    );
  }

  if (tokenCols.length > 0 && !tokenCols.find((c) => c.name === "paused")) {
    database.exec("ALTER TABLE tokens ADD COLUMN paused INTEGER NOT NULL DEFAULT 0");
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS listings (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      token_id            TEXT NOT NULL,
      serial              INTEGER NOT NULL,
      seller_account_id   TEXT NOT NULL,
      ask_price_hbar      REAL NOT NULL,
      min_bid_hbar        REAL,
      status              TEXT NOT NULL DEFAULT 'open',
      expires_at          TEXT NOT NULL,
      created_at          TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS bids (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id          INTEGER NOT NULL,
      bidder_account_id   TEXT NOT NULL,
      bid_price_hbar      REAL NOT NULL,
      status              TEXT NOT NULL DEFAULT 'pending',
      expires_at          TEXT NOT NULL,
      created_at          TEXT DEFAULT (datetime('now')),
      responded_at        TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
    CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller_account_id);
    CREATE INDEX IF NOT EXISTS idx_bids_listing ON bids(listing_id, status);
    CREATE INDEX IF NOT EXISTS idx_bids_bidder ON bids(bidder_account_id, status);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_active_ticket
      ON listings(token_id, serial)
      WHERE status IN ('open', 'pending_settlement');
  `);
}

function seedOperator(database) {
  const operatorId = process.env.OPERATOR_ID;
  const operatorKey = process.env.OPERATOR_KEY;
  if (!operatorId || !operatorKey) return;

  const nullifierHash = `system:${operatorId}`;
  const existing = database
    .prepare("SELECT nullifier_hash FROM users WHERE account_id = ?")
    .get(operatorId);
  if (existing) {
    database
      .prepare("UPDATE users SET role = 'organizer' WHERE account_id = ?")
      .run(operatorId);
    return;
  }

  database
    .prepare(
      "INSERT INTO users (nullifier_hash, account_id, private_key, role) VALUES (?, ?, ?, 'organizer')"
    )
    .run(nullifierHash, operatorId, operatorKey);
}

export function getDb() {
  if (!db) {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    const schema = readFileSync(join(__dirname, "schema.sql"), "utf8");
    db.exec(schema);
    runMigrations(db);
    seedOperator(db);
  }
  return db;
}
