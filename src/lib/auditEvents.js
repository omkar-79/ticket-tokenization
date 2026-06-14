import { getClient, getOperatorKey } from "../client.js";
import { submitAuditEvent } from "../hedera/auditLog.js";

const TOPIC_ID = process.env.HCS_AUDIT_TOPIC_ID?.trim() || null;

function basePayload(event, fields) {
  return {
    v: 1,
    event,
    ts: new Date().toISOString(),
    ...fields,
  };
}

export function buildCollectionCreatedEvent({
  tokenId,
  name,
  maxSupply,
  faceValueHbar,
  organizer,
  royaltyNumerator,
  royaltyDenominator,
}) {
  return basePayload("collection_created", {
    tokenId,
    name,
    maxSupply,
    faceValueHbar,
    organizer,
    royaltyNumerator,
    royaltyDenominator,
  });
}

export function buildPrimarySaleEvent({ tokenId, serial, buyer, seller, priceHbar, txId }) {
  return basePayload("primary_sale", {
    tokenId,
    serial,
    buyer,
    seller,
    priceHbar,
    txId,
  });
}

export function buildSecondarySaleEvent({ tokenId, serial, seller, buyer, priceHbar, txId }) {
  return basePayload("secondary_sale", {
    tokenId,
    serial,
    seller,
    buyer,
    priceHbar,
    txId,
  });
}

export function buildGateCheckinEvent({ tokenId, serial, owner, txId }) {
  return basePayload("gate_checkin", {
    tokenId,
    serial,
    owner,
    txId,
  });
}

export function buildMatchPausedEvent({ tokenId, txId }) {
  return basePayload("match_paused", { tokenId, txId });
}

export function buildMatchResumedEvent({ tokenId, txId }) {
  return basePayload("match_resumed", { tokenId, txId });
}

export async function logAuditEvent(payload) {
  if (!TOPIC_ID) {
    return null;
  }

  const client = getClient();
  try {
    return await submitAuditEvent({
      client,
      topicId: TOPIC_ID,
      operatorKey: getOperatorKey(),
      payload,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`HCS audit log failed (${payload?.event ?? "unknown"}):`, message);
    return null;
  } finally {
    client.close();
  }
}
