import { isEnsConfigured } from "../../src/ens/config.js";

export function getClientConfig() {
  return {
    worldAppId:
      process.env.NEXT_PUBLIC_WORLD_APP_ID?.trim() ||
      process.env.WORLD_APP_ID?.trim() ||
      null,
    worldAction:
      process.env.NEXT_PUBLIC_WORLD_ACTION?.trim() ||
      process.env.WORLD_ACTION?.trim() ||
      null,
    worldEnvironment:
      process.env.NEXT_PUBLIC_WORLD_ENVIRONMENT?.trim() ||
      process.env.WORLD_ENVIRONMENT?.trim() ||
      "staging",
    ensParentName:
      process.env.NEXT_PUBLIC_ENS_PARENT_NAME?.trim() ||
      process.env.ENS_PARENT_NAME?.trim() ||
      "fairpass.eth",
    ensEnabled: isEnsConfigured(),
    listingPollMs: Number(process.env.NEXT_PUBLIC_LISTING_POLL_MS ?? 15000),
    balancePollMs: Number(process.env.NEXT_PUBLIC_BALANCE_POLL_MS ?? 20000),
    gatePollMs: Number(process.env.NEXT_PUBLIC_GATE_POLL_MS ?? 2500),
    gatePassRefreshMs: Number(process.env.NEXT_PUBLIC_GATE_PASS_REFRESH_MS ?? 60000),
  };
}
