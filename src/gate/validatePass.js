import { verifyGatePass } from "../lib/gatePass.js";
import { getTicket, getCurrentOwner, getPassGeneration } from "../db/tickets.js";
import { getNftOwner } from "../hedera/mirror.js";

export async function validateGatePassForScan(pass, expectedTokenId) {
  const verified = verifyGatePass(pass);

  if (verified.tokenId !== String(expectedTokenId)) {
    throw new Error("This pass is for a different event");
  }

  const ticket = getTicket(verified.tokenId, verified.serial);
  if (!ticket) {
    throw new Error("Ticket not found");
  }
  if (ticket.status === "used") {
    throw new Error("Ticket already checked in");
  }

  const currentGen = getPassGeneration(verified.tokenId, verified.serial);
  if (verified.passGeneration !== currentGen) {
    throw new Error(
      "Pass revoked — ticket was resold. The previous holder's QR no longer works."
    );
  }

  const owner = getCurrentOwner(verified.tokenId, verified.serial);
  if (!owner || owner.owner_account_id !== verified.ownerAccountId) {
    throw new Error("Pass owner does not match current ticket holder");
  }

  const onChainOwner = await getNftOwner(verified.tokenId, verified.serial);
  if (!onChainOwner) {
    throw new Error("Could not verify on-chain NFT owner (mirror node lag?)");
  }
  if (onChainOwner !== verified.ownerAccountId) {
    throw new Error("On-chain NFT owner does not match this pass");
  }

  return {
    tokenId: verified.tokenId,
    serial: verified.serial,
    ownerAccountId: verified.ownerAccountId,
    passGeneration: verified.passGeneration,
  };
}
