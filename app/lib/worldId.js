export async function fetchRpContext() {
  const res = await fetch("/api/world-id/sign");
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to fetch World ID signature");
  }
  return {
    rp_id: data.rp_id,
    nonce: data.nonce,
    created_at: data.created_at,
    expires_at: data.expires_at,
    signature: data.signature,
  };
}

export function getWorldIdClientConfig() {
  return {
    appId: process.env.NEXT_PUBLIC_WORLD_APP_ID,
    action: process.env.NEXT_PUBLIC_WORLD_ACTION,
    environment: process.env.NEXT_PUBLIC_WORLD_ENVIRONMENT ?? "staging",
  };
}
