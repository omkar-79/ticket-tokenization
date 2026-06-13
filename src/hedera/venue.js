import { freezeHolder, unfreezeHolder, pauseToken, unpauseToken } from "./compliance.js";
import { getToken, setTokenPaused } from "../db/tokens.js";
import { getTicket, getCurrentOwner, updateTicketStatus, ownedStatusForTicket } from "../db/tickets.js";

export async function scanTicketAtGate({ tokenId, serial }) {
  const token = getToken(tokenId);
  if (!token) {
    throw new Error("Token not found");
  }
  if (token.paused) {
    throw new Error("Match is paused");
  }
  if (!token.keys?.freeze) {
    throw new Error("Freeze key not available for this collection");
  }

  const ticket = getTicket(tokenId, serial);
  if (!ticket) {
    throw new Error("Ticket not found");
  }
  if (ticket.status === "used") {
    throw new Error("Ticket already scanned at gate");
  }

  const owner = getCurrentOwner(tokenId, serial);
  if (!owner?.owner_account_id) {
    throw new Error("No recorded owner for this ticket");
  }

  const result = await freezeHolder({
    tokenId,
    accountId: owner.owner_account_id,
    freezeKeyDer: token.keys.freeze,
  });

  updateTicketStatus(tokenId, serial, "used");

  return {
    serial,
    ownerAccountId: owner.owner_account_id,
    freezeStatus: result.status,
    ticketEnsName: ticket.ens_name ?? null,
    message: "Entry granted — holder frozen for this token (cannot resell)",
  };
}

export async function resetTicketForDemo({ tokenId, serial }) {
  const token = getToken(tokenId);
  if (!token) {
    throw new Error("Token not found");
  }
  if (!token.keys?.freeze) {
    throw new Error("Freeze key not available for this collection");
  }

  const owner = getCurrentOwner(tokenId, serial);
  if (!owner?.owner_account_id) {
    throw new Error("No recorded owner for this ticket");
  }

  const result = await unfreezeHolder({
    tokenId,
    accountId: owner.owner_account_id,
    freezeKeyDer: token.keys.freeze,
  });

  updateTicketStatus(tokenId, serial, ownedStatusForTicket(tokenId, serial));

  return {
    serial,
    ownerAccountId: owner.owner_account_id,
    unfreezeStatus: result.status,
    message: "Ticket reset — holder unfrozen and transferable again",
  };
}

export async function pauseMatch({ tokenId }) {
  const token = getToken(tokenId);
  if (!token) {
    throw new Error("Token not found");
  }
  if (!token.keys?.pause) {
    throw new Error("Pause key not available for this collection");
  }

  const result = await pauseToken({
    tokenId,
    pauseKeyDer: token.keys.pause,
  });

  setTokenPaused(tokenId, true);

  return {
    status: result.status,
    message: "Match paused — no ticket transfers for this event",
  };
}

export async function unpauseMatch({ tokenId }) {
  const token = getToken(tokenId);
  if (!token) {
    throw new Error("Token not found");
  }
  if (!token.keys?.pause) {
    throw new Error("Pause key not available for this collection");
  }

  const result = await unpauseToken({
    tokenId,
    pauseKeyDer: token.keys.pause,
  });

  setTokenPaused(tokenId, false);

  return {
    status: result.status,
    message: "Match resumed — tickets can transfer again",
  };
}
