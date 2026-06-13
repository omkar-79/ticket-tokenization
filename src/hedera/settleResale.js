import { atomicResale } from "./transferTicket.js";
import { getToken } from "../db/tokens.js";
import {
  getCurrentOwner,
  getTicket,
  updateTicketStatus,
  recordOwnership,
} from "../db/tickets.js";
import { requireUser } from "../lib/auth.js";
import { assertTokenTransferable, assertTicketResellable } from "../lib/ticketGuards.js";
import { updateEnsTextRecords } from "../ens/provision.js";
import { checkSecondaryCap } from "../lib/secondaryCap.js";
import {
  buildSecondarySaleEvent,
  logAuditEvent,
} from "../lib/auditEvents.js";

export async function settleSecondarySale({
  tokenId,
  serial,
  sellerAccountId,
  buyerAccountId,
  priceHbar,
  buyerNullifier,
}) {
  const capCheck = checkSecondaryCap(buyerNullifier, tokenId);
  if (!capCheck.ok) {
    throw new Error(capCheck.message);
  }

  assertTokenTransferable(tokenId);
  assertTicketResellable(tokenId, serial);

  const token = getToken(tokenId);

  const owner = getCurrentOwner(tokenId, serial);
  if (!owner || owner.owner_account_id !== sellerAccountId) {
    throw new Error("Seller does not own this ticket");
  }

  const seller = requireUser(sellerAccountId);
  const buyer = requireUser(buyerAccountId);

  const result = await atomicResale({
    tokenId,
    serial,
    sellerAccountId: seller.account_id,
    sellerPrivateKey: seller.private_key,
    buyerAccountId: buyer.account_id,
    buyerPrivateKey: buyer.private_key,
    priceHbar: Number(priceHbar),
  });

  updateTicketStatus(tokenId, serial, "sold_secondary");
  recordOwnership({
    tokenId,
    serial,
    ownerAccountId: buyer.account_id,
    ownerNullifier: buyerNullifier,
    acquisition: "secondary",
    priceHbar: Number(priceHbar),
    txId: result.txId,
  });

  await logAuditEvent(
    buildSecondarySaleEvent({
      tokenId,
      serial,
      seller: seller.account_id,
      buyer: buyer.account_id,
      priceHbar: Number(priceHbar),
      txId: result.txId,
    })
  );

  const ticket = getTicket(tokenId, serial);
  let ensUpdate = null;
  if (ticket?.ens_name) {
    try {
      ensUpdate = await updateEnsTextRecords(ticket.ens_name, {
        "hedera.owner_account_id": buyer.account_id,
      });
    } catch {
      /* ENS is optional; on-chain sale already completed */
    }
  }

  return {
    txId: result.txId,
    hashscanUrl: `https://hashscan.io/testnet/transaction/${result.txId}`,
    royaltyNote: `${token.royalty_numerator}/${token.royalty_denominator} royalty sent to organizer ${token.organizer_account_id} on-chain`,
    organizerAccountId: token.organizer_account_id,
    ticketEnsName: ticket?.ens_name ?? null,
    ensUpdate,
  };
}
