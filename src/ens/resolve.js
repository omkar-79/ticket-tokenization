import { createPublicClient, http, namehash } from "viem";
import { sepolia } from "viem/chains";
import { getEnsChainId, getEnsParentName, isEnsConfigured } from "./config.js";

const RESOLVER_ABI = [
  {
    name: "text",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
    ],
    outputs: [{ name: "", type: "string" }],
  },
];

const SEPOLIA_PUBLIC_RESOLVER =
  process.env.ENS_PUBLIC_RESOLVER ?? "0x8FADE66B79cC9f707aB26799354482EB70a82892";

function getPublicClient() {
  const chainId = getEnsChainId();
  const chain = chainId === sepolia.id ? sepolia : { ...sepolia, id: chainId };
  return createPublicClient({
    chain,
    transport: http(process.env.ENS_RPC_URL),
  });
}

export function isHederaAccountId(value) {
  return /^0\.0\.\d+$/.test(value?.trim() ?? "");
}

export function isEnsName(value) {
  const input = value?.trim().toLowerCase() ?? "";
  if (!input.includes(".")) return false;
  try {
    const parent = getEnsParentName();
    return input.endsWith(`.${parent}`);
  } catch {
    return input.endsWith(".eth");
  }
}

export async function getEnsTextRecord(ensName, key) {
  if (!isEnsConfigured()) {
    throw new Error("ENS is not configured");
  }

  const publicClient = getPublicClient();
  const node = namehash(ensName.toLowerCase());

  return publicClient.readContract({
    address: SEPOLIA_PUBLIC_RESOLVER,
    abi: RESOLVER_ABI,
    functionName: "text",
    args: [node, key],
  });
}

export async function resolveHederaAccountId(input) {
  const trimmed = input?.trim() ?? "";
  if (!trimmed) {
    throw new Error("Buyer identifier is required");
  }
  if (isHederaAccountId(trimmed)) {
    return trimmed;
  }

  const ensName = trimmed.toLowerCase();
  if (!ensName.includes(".")) {
    const parent = getEnsParentName();
    const fullName = `${ensName}.${parent}`;
    return resolveHederaAccountId(fullName);
  }

  const accountId = await getEnsTextRecord(ensName, "hedera.account_id");
  if (!accountId) {
    throw new Error(`ENS name "${ensName}" has no hedera.account_id record`);
  }
  if (!isHederaAccountId(accountId)) {
    throw new Error(`Invalid hedera.account_id on ENS name "${ensName}"`);
  }
  return accountId;
}
