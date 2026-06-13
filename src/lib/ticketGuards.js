import { getToken } from "../db/tokens.js";
import { getTicket } from "../db/tickets.js";

export function assertTokenTransferable(tokenId) {
  const token = getToken(tokenId);
  if (!token) {
    throw new Error("Token not found");
  }
  if (token.paused) {
    throw new Error("This event is paused — tickets cannot be bought or transferred");
  }
  return token;
}

export function assertTicketResellable(tokenId, serial) {
  const ticket = getTicket(tokenId, serial);
  if (!ticket) {
    throw new Error("Ticket not found");
  }
  if (ticket.status === "used") {
    throw new Error("Ticket already used at gate — cannot be listed or sold");
  }
  return ticket;
}
