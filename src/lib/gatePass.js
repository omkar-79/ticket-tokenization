import crypto from "crypto";

const PASS_VERSION = 2;

function getSecret() {
  const secret = process.env.GATE_QR_SECRET?.trim();
  if (!secret) {
    throw new Error("GATE_QR_SECRET is not configured");
  }
  return secret;
}

export function getPassExpiryMinutes() {
  return Number(process.env.GATE_PASS_EXPIRY_MINUTES ?? 15);
}

function canonicalString(payload) {
  return `${payload.v}|${payload.tokenId}|${payload.serial}|${payload.owner}|${payload.gen}|${payload.exp}`;
}

function signPayload(payload) {
  return crypto.createHmac("sha256", getSecret()).update(canonicalString(payload)).digest("base64url");
}

export function createGatePass({ tokenId, serial, ownerAccountId, passGeneration }) {
  const exp = Math.floor(Date.now() / 1000) + getPassExpiryMinutes() * 60;
  const payload = {
    v: PASS_VERSION,
    tokenId: String(tokenId),
    serial: Number(serial),
    owner: String(ownerAccountId),
    gen: Number(passGeneration),
    exp,
  };
  return { ...payload, sig: signPayload(payload) };
}

export function verifyGatePass(pass) {
  if (!pass || pass.v !== PASS_VERSION) {
    throw new Error("Invalid or outdated ticket pass");
  }

  const { sig, ...payload } = pass;
  if (!sig || !payload.tokenId || payload.serial == null || !payload.owner || payload.gen == null || !payload.exp) {
    throw new Error("Malformed ticket pass");
  }

  if (payload.exp * 1000 < Date.now()) {
    throw new Error("Ticket pass expired — refresh the QR on the holder's phone");
  }

  const expected = signPayload(payload);
  const a = Buffer.from(String(sig));
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error("Invalid pass signature — QR may be forged or from a previous owner");
  }

  return {
    tokenId: String(payload.tokenId),
    serial: Number(payload.serial),
    ownerAccountId: String(payload.owner),
    passGeneration: Number(payload.gen),
    expiresAt: payload.exp,
  };
}

export function encodeGatePass(pass) {
  return JSON.stringify(pass);
}

export function tryParseGatePass(text) {
  if (!text?.trim()) return null;
  try {
    const data = JSON.parse(text.trim());
    if (data?.v === PASS_VERSION && data.sig) {
      return data;
    }
  } catch {
    /* not JSON pass */
  }
  return null;
}
