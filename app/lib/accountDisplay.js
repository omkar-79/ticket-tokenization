/** Human-readable account label for nav/header (ENS preferred). */
export function formatAccountDisplay(accountId, ensName, { short = false } = {}) {
  if (ensName?.trim()) {
    const name = ensName.trim();
    if (!short || name.length <= 22) return name;
    const dot = name.indexOf(".");
    if (dot > 0 && dot < 18) {
      return `${name.slice(0, dot + 1)}…${name.slice(-4)}`;
    }
    return `${name.slice(0, 14)}…${name.slice(-4)}`;
  }
  if (!accountId) return null;
  if (short && accountId.length > 12) {
    return `${accountId.slice(0, 6)}…${accountId.slice(-4)}`;
  }
  return accountId;
}
