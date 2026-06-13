import { getDb } from "./db.js";

export function insertTicket({ tokenId, serial, metadataUri, metadataJson, ensName = null, status = "minted" }) {
  getDb()
    .prepare(
      "INSERT INTO tickets (token_id, serial, metadata_uri, metadata_json, ens_name, status) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(tokenId, serial, metadataUri, metadataJson ? JSON.stringify(metadataJson) : null, ensName, status);
}

export function getTicketByEnsName(ensName) {
  const row = getDb()
    .prepare("SELECT * FROM tickets WHERE ens_name = ?")
    .get(ensName);
  if (!row) return null;
  return {
    ...row,
    metadata_json: row.metadata_json ? JSON.parse(row.metadata_json) : null,
  };
}

export function getTicket(tokenId, serial) {
  const row = getDb()
    .prepare("SELECT * FROM tickets WHERE token_id = ? AND serial = ?")
    .get(tokenId, serial);
  if (!row) return null;
  return {
    ...row,
    metadata_json: row.metadata_json ? JSON.parse(row.metadata_json) : null,
  };
}

export function updateTicketEnsName(tokenId, serial, ensName) {
  getDb()
    .prepare("UPDATE tickets SET ens_name = ? WHERE token_id = ? AND serial = ?")
    .run(ensName, tokenId, serial);
}

export function updateTicketStatus(tokenId, serial, status) {
  getDb()
    .prepare("UPDATE tickets SET status = ? WHERE token_id = ? AND serial = ?")
    .run(status, tokenId, serial);
}

/** Status when a ticket is owned but not actively listed (supports repeat resales). */
export function ownedStatusForTicket(tokenId, serial) {
  const owner = getCurrentOwner(tokenId, serial);
  if (!owner) return "minted";
  return owner.acquisition === "primary" ? "sold_primary" : "sold_secondary";
}

export function listTickets(tokenId, { status } = {}) {
  if (status) {
    return getDb()
      .prepare("SELECT * FROM tickets WHERE token_id = ? AND status = ? ORDER BY serial")
      .all(tokenId, status);
  }
  return getDb()
    .prepare("SELECT * FROM tickets WHERE token_id = ? ORDER BY serial")
    .all(tokenId);
}

export function listAvailablePrimary(tokenId) {
  return getDb()
    .prepare("SELECT * FROM tickets WHERE token_id = ? AND status = 'minted' ORDER BY serial")
    .all(tokenId);
}

export function getPassGeneration(tokenId, serial) {
  const row = getDb()
    .prepare("SELECT pass_generation FROM tickets WHERE token_id = ? AND serial = ?")
    .get(tokenId, serial);
  return row?.pass_generation ?? 0;
}

export function bumpPassGeneration(tokenId, serial) {
  getDb()
    .prepare(
      "UPDATE tickets SET pass_generation = pass_generation + 1 WHERE token_id = ? AND serial = ?"
    )
    .run(tokenId, serial);
  return getPassGeneration(tokenId, serial);
}

export function recordOwnership({
  tokenId,
  serial,
  ownerAccountId,
  ownerNullifier,
  acquisition,
  priceHbar,
  txId,
}) {
  getDb()
    .prepare(
      `INSERT INTO ownership (
        token_id, serial, owner_account_id, owner_nullifier,
        acquisition, price_hbar, tx_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(tokenId, serial, ownerAccountId, ownerNullifier, acquisition, priceHbar, txId);
  bumpPassGeneration(tokenId, serial);
}

export function getCurrentOwner(tokenId, serial) {
  return getDb()
    .prepare(
      `SELECT * FROM ownership
       WHERE token_id = ? AND serial = ?
       ORDER BY acquired_at DESC, id DESC LIMIT 1`
    )
    .get(tokenId, serial);
}

export function getOwnershipHistory(tokenId, serial) {
  return getDb()
    .prepare(
      "SELECT * FROM ownership WHERE token_id = ? AND serial = ? ORDER BY acquired_at ASC"
    )
    .all(tokenId, serial);
}

export function listTicketsByOwner(ownerAccountId) {
  return getDb()
    .prepare(
      `SELECT t.*, o.acquisition, o.price_hbar, o.acquired_at
       FROM ownership o
       JOIN tickets t ON t.token_id = o.token_id AND t.serial = o.serial
       WHERE o.owner_account_id = ?
       AND o.id = (
         SELECT MAX(o2.id) FROM ownership o2
         WHERE o2.token_id = o.token_id AND o2.serial = o.serial
       )
       ORDER BY o.acquired_at DESC`
    )
    .all(ownerAccountId);
}

/** Tickets this account previously held and no longer owns. */
export function listFormerTicketsByOwner(ownerAccountId) {
  const rows = getDb()
    .prepare(
      `SELECT o.* FROM ownership o
       WHERE o.owner_account_id = ?
       ORDER BY o.acquired_at DESC`
    )
    .all(ownerAccountId);

  const former = [];
  for (const row of rows) {
    const current = getCurrentOwner(row.token_id, row.serial);
    if (current && current.id === row.id) continue;

    const next = getDb()
      .prepare(
        `SELECT * FROM ownership
         WHERE token_id = ? AND serial = ? AND id > ?
         ORDER BY id ASC LIMIT 1`
      )
      .get(row.token_id, row.serial, row.id);

    former.push({
      tokenId: row.token_id,
      serial: row.serial,
      acquisition: row.acquisition,
      heldFrom: row.acquired_at,
      boughtPriceHbar: row.price_hbar,
      heldUntil: next?.acquired_at ?? null,
      soldPriceHbar: next?.price_hbar ?? null,
      soldTo: next?.owner_account_id ?? null,
      saleTxId: next?.tx_id ?? null,
      history: getOwnershipHistory(row.token_id, row.serial),
    });
  }
  return former;
}

export function countSecondaryByNullifier(nullifierHash) {
  const row = getDb()
    .prepare(
      "SELECT COUNT(*) AS count FROM ownership WHERE owner_nullifier = ? AND acquisition = 'secondary'"
    )
    .get(nullifierHash);
  return row?.count ?? 0;
}

export function countSecondaryByNullifierForToken(nullifierHash, tokenId) {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS count FROM ownership
       WHERE owner_nullifier = ? AND acquisition = 'secondary' AND token_id = ?`
    )
    .get(nullifierHash, tokenId);
  return row?.count ?? 0;
}
