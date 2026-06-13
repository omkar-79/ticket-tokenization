import "dotenv/config";
import { getAddress } from "viem";

const ZERO = "0x0000000000000000000000000000000000000000";

function ensAddress(envKey, fallback) {
  const raw = process.env[envKey]?.trim() || fallback;
  return getAddress(raw);
}

export const SEPOLIA_ENS_REGISTRY = ensAddress(
  "ENS_REGISTRY",
  "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e"
);
export const SEPOLIA_NAME_WRAPPER = ensAddress(
  "ENS_NAME_WRAPPER",
  "0x0635513f179D50A207757E05759CbD2d0eFc26F0"
);
export const SEPOLIA_PUBLIC_RESOLVER = ensAddress(
  "ENS_PUBLIC_RESOLVER",
  "0x8FADE66B79cC9f707aB26799354482EB70a82892"
);

export function isEnsConfigured() {
  return Boolean(
    process.env.ENS_PARENT_NAME &&
      process.env.ENS_OPERATOR_KEY &&
      process.env.ENS_RPC_URL
  );
}

export function getEnsParentName() {
  const parent = process.env.ENS_PARENT_NAME?.trim().toLowerCase();
  if (!parent) {
    throw new Error("ENS_PARENT_NAME is not configured");
  }
  return parent;
}

export function getEnsChainId() {
  return Number(process.env.ENS_CHAIN_ID ?? 11155111);
}

export function getEnsRpcUrls() {
  const primary = process.env.ENS_RPC_URL?.trim();
  const fallbacks = [
    "https://ethereum-sepolia-rpc.publicnode.com",
    "https://1rpc.io/sepolia",
    "https://rpc2.sepolia.org",
  ];
  return [...new Set([...(primary ? [primary] : []), ...fallbacks])];
}

export { ZERO };
