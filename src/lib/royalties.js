import { getToken } from "../db/tokens.js";
import { listTickets, getOwnershipHistory, getCurrentOwner } from "../db/tickets.js";

export function royaltyFromSale(priceHbar, numerator, denominator) {
  const price = Number(priceHbar);
  if (!Number.isFinite(price) || price <= 0) return 0;
  return (price * numerator) / denominator;
}

export function sumTicketResaleRoyalties(tokenId, serial, numerator, denominator) {
  const history = getOwnershipHistory(tokenId, serial);
  let resaleFeesEarnedHbar = 0;
  let secondarySaleCount = 0;

  for (const row of history) {
    if (row.acquisition === "secondary") {
      resaleFeesEarnedHbar += royaltyFromSale(
        row.price_hbar,
        numerator,
        denominator
      );
      secondarySaleCount += 1;
    }
  }

  return { resaleFeesEarnedHbar, secondarySaleCount };
}

export function getTokenRoyaltySummary(tokenId) {
  const token = getToken(tokenId);
  if (!token) {
    return {
      primarySales: 0,
      ticketsResold: 0,
      resaleTransactions: 0,
      heldOnResale: 0,
      totalResaleFeesHbar: 0,
      totalSecondarySales: 0,
    };
  }

  const tickets = listTickets(tokenId);
  let totalResaleFeesHbar = 0;
  let resaleTransactions = 0;
  let ticketsResold = 0;
  let heldOnResale = 0;

  for (const t of tickets) {
    const perTicket = sumTicketResaleRoyalties(
      tokenId,
      t.serial,
      token.royalty_numerator,
      token.royalty_denominator
    );
    totalResaleFeesHbar += perTicket.resaleFeesEarnedHbar;
    resaleTransactions += perTicket.secondarySaleCount;
    if (perTicket.secondarySaleCount > 0) {
      ticketsResold += 1;
    }
    const owner = getCurrentOwner(tokenId, t.serial);
    if (owner?.acquisition === "secondary") {
      heldOnResale += 1;
    }
  }

  return {
    primarySales: token.minted_count,
    ticketsResold,
    resaleTransactions,
    heldOnResale,
    totalResaleFeesHbar,
    /** @deprecated use resaleTransactions */
    totalSecondarySales: resaleTransactions,
  };
}

export function enrichTicketsWithRoyalties(tokenId, tickets) {
  const token = getToken(tokenId);
  if (!token) return tickets;

  return tickets.map((t) => ({
    ...t,
    ...sumTicketResaleRoyalties(
      tokenId,
      t.serial,
      token.royalty_numerator,
      token.royalty_denominator
    ),
  }));
}

export function formatHbar(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n === 0) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}
