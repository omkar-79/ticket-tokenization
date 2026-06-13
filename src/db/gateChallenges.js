import crypto from "crypto";
import { getDb } from "./db.js";

function challengeExpiryMinutes() {
  return Number(process.env.GATE_CHALLENGE_EXPIRY_MINUTES ?? 3);
}

export function expireStaleChallenges() {
  getDb()
    .prepare(
      `UPDATE gate_challenges SET status = 'expired'
       WHERE status = 'pending' AND expires_at < datetime('now')`
    )
    .run();
}

export function createGateChallenge({
  tokenId,
  serial,
  ownerAccountId,
  organizerAccountId,
  passGeneration,
}) {
  expireStaleChallenges();

  getDb()
    .prepare(
      `UPDATE gate_challenges SET status = 'cancelled'
       WHERE token_id = ? AND serial = ? AND status = 'pending'`
    )
    .run(tokenId, serial);

  const id = crypto.randomUUID();
  const minutes = challengeExpiryMinutes();
  getDb()
    .prepare(
      `INSERT INTO gate_challenges (
        id, token_id, serial, owner_account_id, organizer_account_id,
        pass_generation, status, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now', '+' || ? || ' minutes'))`
    )
    .run(id, tokenId, serial, ownerAccountId, organizerAccountId, passGeneration, minutes);

  return getGateChallenge(id);
}

export function getGateChallenge(id) {
  expireStaleChallenges();
  const row = getDb().prepare("SELECT * FROM gate_challenges WHERE id = ?").get(id);
  if (!row) return null;
  return mapChallenge(row);
}

export function getPendingChallengeForTicket(tokenId, serial, ownerAccountId) {
  expireStaleChallenges();
  const row = getDb()
    .prepare(
      `SELECT * FROM gate_challenges
       WHERE token_id = ? AND serial = ? AND owner_account_id = ?
         AND status = 'pending' AND expires_at >= datetime('now')
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(tokenId, serial, ownerAccountId);
  return row ? mapChallenge(row) : null;
}

export function confirmGateChallenge(id, ownerAccountId) {
  expireStaleChallenges();
  const row = getDb().prepare("SELECT * FROM gate_challenges WHERE id = ?").get(id);
  if (!row) {
    throw new Error("Gate challenge not found");
  }
  if (row.status !== "pending") {
    throw new Error(`Challenge already ${row.status}`);
  }
  if (row.owner_account_id !== ownerAccountId) {
    throw new Error("Only the ticket holder can confirm this challenge");
  }
  if (new Date(row.expires_at) < new Date()) {
    getDb().prepare("UPDATE gate_challenges SET status = 'expired' WHERE id = ?").run(id);
    throw new Error("Gate challenge expired — ask the organizer to scan again");
  }

  getDb()
    .prepare(
      `UPDATE gate_challenges SET status = 'confirmed', confirmed_at = datetime('now') WHERE id = ?`
    )
    .run(id);

  return getGateChallenge(id);
}

export function cancelGateChallenge(id, organizerAccountId) {
  expireStaleChallenges();
  const row = getDb().prepare("SELECT * FROM gate_challenges WHERE id = ?").get(id);
  if (!row) {
    throw new Error("Gate challenge not found");
  }
  if (row.organizer_account_id !== organizerAccountId) {
    throw new Error("Only the organizer who started this scan can cancel");
  }
  if (row.status !== "pending") {
    throw new Error(`Challenge already ${row.status}`);
  }

  getDb()
    .prepare("UPDATE gate_challenges SET status = 'cancelled' WHERE id = ?")
    .run(id);

  return getGateChallenge(id);
}

function mapChallenge(row) {
  return {
    id: row.id,
    tokenId: row.token_id,
    serial: row.serial,
    ownerAccountId: row.owner_account_id,
    organizerAccountId: row.organizer_account_id,
    passGeneration: row.pass_generation,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at ?? null,
  };
}
