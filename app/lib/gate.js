/** Relative path opened when an organizer scans a fan's ticket QR (legacy fallback). */
export function gateScanPath(tokenId, serial) {
  return `/gate/${encodeURIComponent(tokenId)}/${serial}`;
}

export function buildGateScanUrl(origin, tokenId, serial) {
  const base = (origin ?? "").replace(/\/$/, "");
  return `${base}${gateScanPath(tokenId, serial)}`;
}

/** Legacy compact payload — superseded by signed v2 pass from /api/tickets/.../pass */
export function gateScanPayload(tokenId, serial) {
  return JSON.stringify({ v: 1, tokenId, serial: Number(serial) });
}

export function parseGateScanPayload(text) {
  if (!text?.trim()) return null;
  const raw = text.trim();

  try {
    const data = JSON.parse(raw);
    if (data?.v === 2 && data.sig) {
      return {
        tokenId: String(data.tokenId),
        serial: Number(data.serial),
        pass: data,
      };
    }
    if (data?.tokenId && data?.serial != null) {
      return { tokenId: String(data.tokenId), serial: Number(data.serial), pass: null };
    }
  } catch {
    /* not JSON — try URL */
  }

  try {
    const url = new URL(raw, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    let match = url.pathname.match(/^\/gate\/([^/]+)\/(\d+)\/?$/);
    if (match) {
      return { tokenId: decodeURIComponent(match[1]), serial: Number(match[2]), pass: null };
    }
    match = url.pathname.match(/^\/tickets\/([^/]+)\/(\d+)\/?$/);
    if (match) {
      return { tokenId: decodeURIComponent(match[1]), serial: Number(match[2]), pass: null };
    }
  } catch {
    return null;
  }
  return null;
}
