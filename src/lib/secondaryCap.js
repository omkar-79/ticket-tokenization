import { countSecondaryByNullifierForToken } from "../db/tickets.js";

export function getSecondaryCap() {
  return Number(process.env.SECONDARY_PURCHASE_CAP ?? 1);
}

export function checkSecondaryCap(nullifierHash, tokenId) {
  const cap = getSecondaryCap();
  if (!nullifierHash || !tokenId) {
    return { ok: true, count: 0, cap, tokenId };
  }
  const count = countSecondaryByNullifierForToken(nullifierHash, tokenId);
  if (count >= cap) {
    return {
      ok: false,
      count,
      cap,
      tokenId,
      message: `Resale limit reached for this event (${count}/${cap} per World ID). You can still buy resale tickets for other events.`,
    };
  }
  return { ok: true, count, cap, tokenId };
}
