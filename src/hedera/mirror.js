const MIRROR_BASE = "https://testnet.mirrornode.hedera.com/api/v1";
const FEE_BUFFER_HBAR = Number(process.env.HBAR_FEE_BUFFER ?? 5);

export async function getHbarBalance(accountId) {
  const res = await fetch(`${MIRROR_BASE}/accounts/${accountId}`);
  if (!res.ok) {
    return null;
  }
  const data = await res.json();
  const tinybars = Number(data.balance?.balance ?? data.balance ?? 0);
  return tinybars / 1e8;
}

export async function softCheckBidderBalance(bidderAccountId, priceHbar) {
  const balance = await getHbarBalance(bidderAccountId);
  if (balance === null) {
    return { ok: true, warning: "Could not verify HBAR balance; proceeding anyway" };
  }
  const required = Number(priceHbar) + FEE_BUFFER_HBAR;
  if (balance < required) {
    return {
      ok: false,
      balance,
      required,
      warning: `Bidder balance ~${balance.toFixed(2)} HBAR may be insufficient for ${priceHbar} HBAR + fees (~${FEE_BUFFER_HBAR} HBAR buffer)`,
    };
  }
  return { ok: true, balance, required };
}
