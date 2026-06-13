export function extractNullifier(proof) {
  if (proof?.responses?.[0]?.nullifier) {
    return proof.responses[0].nullifier;
  }
  if (proof?.nullifier_hash) {
    return proof.nullifier_hash;
  }
  return null;
}

function verifyBaseUrl() {
  return process.env.WORLD_ENVIRONMENT === "staging"
    ? "https://staging-developer.worldcoin.org"
    : "https://developer.world.org";
}

export async function verifyWorldIdProof(proof, action) {
  const rpId = process.env.WORLD_RP_ID;

  // World ID 4.0 apps must verify via v4 (accepts both 3.0 and 4.0 proof payloads).
  if (rpId) {
    const res = await fetch(`${verifyBaseUrl()}/api/v4/verify/${rpId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(proof),
    });

    const data = await res.json();
    if (!res.ok || data.success !== true) {
      const detail = data.detail ?? data.code ?? "Invalid World ID proof";
      throw new Error(detail);
    }
    return data;
  }

  const appId = process.env.WORLD_APP_ID;
  if (!appId) {
    throw new Error("WORLD_APP_ID is not configured");
  }

  const response = proof?.responses?.[0] ?? proof;
  const res = await fetch(
    `https://developer.worldcoin.org/api/v2/verify/${appId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nullifier_hash: response.nullifier ?? proof.nullifier_hash,
        merkle_root: response.merkle_root ?? proof.merkle_root,
        proof: response.proof ?? proof.proof,
        verification_level: proof.verification_level ?? "device",
        action: proof.action ?? action,
      }),
    }
  );

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.detail ?? data.code ?? "Invalid World ID proof");
  }
  return data;
}
