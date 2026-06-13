import { mintTickets } from "./mintTicket.js";
import { primarySale } from "./transferTicket.js";
import { findByAccountId } from "../db/users.js";
import { getToken, incrementMintedCount } from "../db/tokens.js";
import { insertTicket, recordOwnership } from "../db/tickets.js";
import {
  buildTicketLabel,
  buildTicketTextRecords,
} from "../ens/identity.js";
import { provisionTicketSubname } from "../ens/provision.js";
import { isEnsConfigured } from "../ens/config.js";

export async function primaryPurchase({
  tokenId,
  buyerAccountId,
  buyerPrivateKey,
  buyerNullifier,
  priceHbar,
  metadataUri,
  metadataJson,
  ticketMeta = {},
}) {
  const token = getToken(tokenId);
  if (!token) {
    throw new Error("Token not found");
  }
  if (token.minted_count >= token.max_supply) {
    throw new Error(`Sold out: ${token.minted_count}/${token.max_supply} minted`);
  }

  const organizer = findByAccountId(token.organizer_account_id);
  if (!organizer) {
    throw new Error("Organizer account not found");
  }

  const { serials } = await mintTickets(tokenId, token.keys.supply, [metadataUri]);
  const serial = Number(serials[0]);

  const result = await primarySale({
    tokenId,
    serial,
    sellerAccountId: organizer.account_id,
    sellerPrivateKey: organizer.private_key,
    buyerAccountId,
    buyerPrivateKey,
    priceHbar,
  });

  const fullMetadata = {
    ...ticketMeta,
    ...metadataJson,
    tokenId,
    serial,
    organizerAccountId: token.organizer_account_id,
  };

  let ensName = null;
  let ensWarning = null;
  if (isEnsConfigured()) {
    try {
      const label = buildTicketLabel(token.name, serial, tokenId);
      const textRecords = buildTicketTextRecords({ ownerAccountId: buyerAccountId });
      const ens = await provisionTicketSubname({ label, textRecords });
      ensName = ens?.ensName ?? null;
      if (ensName) {
        fullMetadata.ensName = ensName;
      }
    } catch (err) {
      ensWarning = err instanceof Error ? err.message : "ENS provisioning failed";
    }
  }

  insertTicket({
    tokenId,
    serial,
    metadataUri,
    metadataJson: fullMetadata,
    ensName,
    status: "sold_primary",
  });

  incrementMintedCount(tokenId, 1);

  recordOwnership({
    tokenId,
    serial,
    ownerAccountId: buyerAccountId,
    ownerNullifier: buyerNullifier ?? null,
    acquisition: "primary",
    priceHbar,
    txId: result.txId,
  });

  return {
    serial,
    txId: result.txId,
    hashscanUrl: `https://hashscan.io/testnet/transaction/${result.txId}`,
    mintedCount: token.minted_count + 1,
    maxSupply: token.max_supply,
    ensName,
    ensWarning,
  };
}
