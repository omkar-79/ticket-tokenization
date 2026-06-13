import { findByAccountId } from "../db/users.js";

export function enrichOwnershipHistory(history) {
  return (history ?? []).map((row) => {
    const user = findByAccountId(row.owner_account_id);
    return { ...row, ownerEnsName: user?.ens_name ?? null };
  });
}
