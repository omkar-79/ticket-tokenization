import { getEnsParentName } from "./config.js";

const LABEL_RE = /^[a-z][a-z0-9-]{2,31}$/;

export function validateEnsLabel(label) {
  const normalized = label?.trim().toLowerCase();
  if (!normalized || !LABEL_RE.test(normalized)) {
    throw new Error(
      "ENS name must be 3-32 characters: lowercase letters, numbers, hyphens; start with a letter"
    );
  }
  if (normalized.startsWith("-") || normalized.endsWith("-")) {
    throw new Error("ENS name cannot start or end with a hyphen");
  }
  return normalized;
}

export function slugifyEventName(name, tokenId = null) {
  let slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!slug) {
    slug = "event";
  }

  if (slug.length > 40) {
    slug = slug.slice(0, 40).replace(/-$/, "");
  }

  if (tokenId) {
    const suffix = tokenId.replace(/\./g, "-");
    const maxBase = Math.max(8, 48 - suffix.length - 1);
    slug = `${slug.slice(0, maxBase)}-${suffix}`;
  }

  return slug;
}

export function buildTicketLabel(eventName, serial, tokenId = null) {
  const eventSlug = slugifyEventName(eventName, tokenId);
  return `${eventSlug}-${serial}`;
}

export function buildEnsName(label, parentName = getEnsParentName()) {
  return `${label}.${parentName}`;
}

/** One text record — 1 setText tx per user (plus subname create). */
export function buildUserTextRecords({ accountId }) {
  return {
    "hedera.account_id": accountId,
  };
}

/** One text record — event+serial are in the label; owner updates on resale. */
export function buildTicketTextRecords({ ownerAccountId }) {
  return {
    "hedera.owner_account_id": ownerAccountId,
  };
}
