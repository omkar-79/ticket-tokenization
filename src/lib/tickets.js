export function getAppBaseUrl(request) {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, "");
  if (request) {
    const host = request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") ?? "http";
    if (host) return `${proto}://${host}`;
  }
  return "http://localhost:3000";
}

export function ticketMetadataUri(baseUrl, tokenId, serial) {
  return `${baseUrl}/api/tickets/${tokenId}/${serial}`;
}
