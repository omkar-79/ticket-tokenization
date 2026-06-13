import { getDb } from "./db.js";

export function createToken({
  tokenId,
  organizerAccountId,
  name,
  symbol,
  maxSupply,
  primaryPriceHbar,
  royaltyNumerator = 10,
  royaltyDenominator = 100,
  keys,
}) {
  getDb()
    .prepare(
      `INSERT INTO tokens (
        token_id, organizer_account_id, name, symbol, max_supply, primary_price_hbar,
        royalty_numerator, royalty_denominator, keys_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      tokenId,
      organizerAccountId,
      name,
      symbol,
      maxSupply,
      primaryPriceHbar,
      royaltyNumerator,
      royaltyDenominator,
      JSON.stringify(keys)
    );
  return getToken(tokenId);
}

export function getToken(tokenId) {
  const row = getDb()
    .prepare("SELECT * FROM tokens WHERE token_id = ?")
    .get(tokenId);
  if (!row) return null;
  return {
    ...row,
    keys: JSON.parse(row.keys_json),
    paused: Boolean(row.paused),
  };
}

export function listTokens() {
  return getDb()
    .prepare("SELECT * FROM tokens ORDER BY created_at DESC")
    .all()
    .map((row) => ({
      ...row,
      keys: JSON.parse(row.keys_json),
      paused: Boolean(row.paused),
    }));
}

export function listTokensByOrganizer(organizerAccountId) {
  return getDb()
    .prepare("SELECT * FROM tokens WHERE organizer_account_id = ? ORDER BY created_at DESC")
    .all(organizerAccountId)
    .map((row) => ({
      ...row,
      keys: JSON.parse(row.keys_json),
      paused: Boolean(row.paused),
    }));
}

export function setTokenPaused(tokenId, paused) {
  getDb()
    .prepare("UPDATE tokens SET paused = ? WHERE token_id = ?")
    .run(paused ? 1 : 0, tokenId);
  return getToken(tokenId);
}

export function incrementMintedCount(tokenId, count) {
  getDb()
    .prepare("UPDATE tokens SET minted_count = minted_count + ? WHERE token_id = ?")
    .run(count, tokenId);
  return getToken(tokenId);
}
