import { atomicResale } from "../src/hedera/transferTicket.js";
import { loadState } from "../src/state.js";
import { getToken } from "../src/db/tokens.js";
import {
  getTicket,
  getCurrentOwner,
  updateTicketStatus,
  recordOwnership,
} from "../src/db/tickets.js";
import { findByAccountId } from "../src/db/users.js";

const serial = Number(process.argv[2] ?? 1);
const priceHbar = Number(process.argv[3] ?? 50);
const sellerAccountId = process.argv[4];
const buyerAccountId = process.argv[5];
const { tokenId } = loadState();

if (!tokenId || !sellerAccountId || !buyerAccountId) {
  throw new Error(
    "Usage: node scripts/06-resale.js [serial] [priceHbar] [sellerAccountId] [buyerAccountId]"
  );
}

const token = getToken(tokenId);
const owner = getCurrentOwner(tokenId, serial);
if (!owner || owner.owner_account_id !== sellerAccountId) {
  throw new Error("Seller does not own this ticket");
}

const seller = findByAccountId(sellerAccountId);
const buyer = findByAccountId(buyerAccountId);
if (!seller || !buyer) {
  throw new Error("Seller or buyer not found in DB");
}

const result = await atomicResale({
  tokenId,
  serial,
  sellerAccountId: seller.account_id,
  sellerPrivateKey: seller.private_key,
  buyerAccountId: buyer.account_id,
  buyerPrivateKey: buyer.private_key,
  priceHbar,
});

updateTicketStatus(tokenId, serial, "sold_secondary");
recordOwnership({
  tokenId,
  serial,
  ownerAccountId: buyer.account_id,
  ownerNullifier: buyer.nullifier_hash,
  acquisition: "secondary",
  priceHbar,
  txId: result.txId,
});

console.log("Atomic resale complete");
console.log("TX:", result.txId);
console.log("HashScan:", "https://hashscan.io/testnet/transaction/" + result.txId);
console.log(
  `Royalty ${token.royalty_numerator}/${token.royalty_denominator} paid to organizer ${token.organizer_account_id} on-chain`
);
