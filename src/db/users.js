import { getDb } from "./db.js";

const USER_COLUMNS =
  "nullifier_hash, account_id, private_key, ens_name, ens_label, ens_records_json, role, created_at";

export function findByNullifier(nullifierHash) {
  return getDb()
    .prepare(`SELECT ${USER_COLUMNS} FROM users WHERE nullifier_hash = ?`)
    .get(nullifierHash);
}

export function findByAccountId(accountId) {
  return getDb()
    .prepare(`SELECT ${USER_COLUMNS} FROM users WHERE account_id = ?`)
    .get(accountId);
}

export function findByEnsLabel(ensLabel) {
  return getDb()
    .prepare(`SELECT ${USER_COLUMNS} FROM users WHERE ens_label = ?`)
    .get(ensLabel?.trim().toLowerCase());
}

export function createUser({
  nullifierHash,
  accountId,
  privateKey,
  ensName = null,
  ensLabel = null,
  ensRecords = null,
  role = "purchaser",
}) {
  getDb()
    .prepare(
      `INSERT INTO users (
        nullifier_hash, account_id, private_key, ens_name, ens_label, ens_records_json, role
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      nullifierHash,
      accountId,
      privateKey,
      ensName,
      ensLabel,
      ensRecords ? JSON.stringify(ensRecords) : null,
      role
    );
  return { nullifierHash, accountId, ensName, ensLabel, ensRecords, role };
}

export function setRole(accountId, role) {
  const result = getDb()
    .prepare("UPDATE users SET role = ? WHERE account_id = ?")
    .run(role, accountId);
  if (result.changes === 0) return null;
  return findByAccountId(accountId);
}

export function promoteToReseller(accountId) {
  const user = findByAccountId(accountId);
  if (!user || user.role === "organizer") return user;
  if (user.role === "reseller") return user;
  return setRole(accountId, "reseller");
}
