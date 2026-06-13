import {
  createPublicClient,
  createWalletClient,
  fallback,
  http,
  namehash,
  zeroAddress,
} from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { findByEnsLabel } from "../db/users.js";
import { getTicketByEnsName } from "../db/tickets.js";
import { buildEnsName } from "./identity.js";
import {
  getEnsChainId,
  getEnsParentName,
  getEnsRpcUrls,
  isEnsConfigured,
  SEPOLIA_ENS_REGISTRY,
  SEPOLIA_NAME_WRAPPER,
  SEPOLIA_PUBLIC_RESOLVER,
  ZERO,
} from "./config.js";

const REGISTRY_ABI = [
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
  },
];

const NAME_WRAPPER_ABI = [
  {
    name: "setSubnodeRecord",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "parentNode", type: "bytes32" },
      { name: "label", type: "string" },
      { name: "owner", type: "address" },
      { name: "resolver", type: "address" },
      { name: "ttl", type: "uint64" },
      { name: "fuses", type: "uint32" },
      { name: "expiry", type: "uint64" },
    ],
    outputs: [{ name: "node", type: "bytes32" }],
  },
];

const RESOLVER_ABI = [
  {
    name: "setText",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
      { name: "value", type: "string" },
    ],
    outputs: [],
  },
];

function getClients() {
  const key = process.env.ENS_OPERATOR_KEY;
  if (!key) {
    throw new Error("ENS_OPERATOR_KEY is not configured");
  }
  const account = privateKeyToAccount(key.startsWith("0x") ? key : `0x${key}`);
  const chainId = getEnsChainId();
  const chain = chainId === sepolia.id ? sepolia : { ...sepolia, id: chainId };
  const transport = fallback(getEnsRpcUrls().map((url) => http(url)));

  const publicClient = createPublicClient({ chain, transport });
  const walletClient = createWalletClient({ account, chain, transport });
  return { publicClient, walletClient, account };
}

async function isNodeAvailable(ensName) {
  const { publicClient } = getClients();
  const owner = await publicClient.readContract({
    address: SEPOLIA_ENS_REGISTRY,
    abi: REGISTRY_ABI,
    functionName: "owner",
    args: [namehash(ensName)],
  });
  return owner === ZERO || owner === zeroAddress;
}

export async function checkLabelAvailable(label) {
  if (!isEnsConfigured()) {
    return { available: true, configured: false };
  }

  const parentName = getEnsParentName();
  const ensName = buildEnsName(label, parentName);

  if (findByEnsLabel(label)) {
    return { available: false, ensName, reason: "taken_in_app" };
  }

  const onChainFree = await isNodeAvailable(ensName);
  if (!onChainFree) {
    return { available: false, ensName, reason: "taken_on_chain" };
  }

  return { available: true, ensName, configured: true };
}

async function ensureSubnode(label) {
  const { publicClient, walletClient, account } = getClients();
  const parentName = getEnsParentName();
  const ensName = buildEnsName(label, parentName);
  const node = namehash(ensName);

  const existingOwner = await publicClient.readContract({
    address: SEPOLIA_ENS_REGISTRY,
    abi: REGISTRY_ABI,
    functionName: "owner",
    args: [node],
  });

  if (existingOwner !== ZERO && existingOwner !== zeroAddress) {
    return { ensName, node, created: false };
  }

  const parentNode = namehash(parentName);
  const hash = await walletClient.writeContract({
    address: SEPOLIA_NAME_WRAPPER,
    abi: NAME_WRAPPER_ABI,
    functionName: "setSubnodeRecord",
    args: [
      parentNode,
      label,
      account.address,
      SEPOLIA_PUBLIC_RESOLVER,
      0n,
      0,
      0xffffffffffffffffn,
    ],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return { ensName, node, created: true, txHash: hash };
}

async function setTextRecords(node, textRecords) {
  const { publicClient, walletClient } = getClients();
  const txHashes = [];

  for (const [key, value] of Object.entries(textRecords)) {
    const hash = await walletClient.writeContract({
      address: SEPOLIA_PUBLIC_RESOLVER,
      abi: RESOLVER_ABI,
      functionName: "setText",
      args: [node, key, value ?? ""],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    txHashes.push(hash);
  }

  return txHashes;
}

export async function provisionUserSubname({ label, textRecords }) {
  if (!isEnsConfigured()) {
    return null;
  }

  const availability = await checkLabelAvailable(label);
  if (!availability.available) {
    throw new Error(`ENS name "${label}" is not available`);
  }

  const { ensName, node, txHash } = await ensureSubnode(label);
  const recordTxHashes = await setTextRecords(node, textRecords);

  return {
    ensName,
    ensLabel: label,
    textRecords,
    txHashes: [txHash, ...recordTxHashes].filter(Boolean),
  };
}

export async function provisionTicketSubname({ label, textRecords }) {
  if (!isEnsConfigured()) {
    return null;
  }

  const ensName = buildEnsName(label);
  if (getTicketByEnsName(ensName)) {
    throw new Error(`Ticket ENS name already exists: ${ensName}`);
  }

  const onChainFree = await isNodeAvailable(ensName);
  if (!onChainFree) {
    throw new Error(`ENS name already registered on-chain: ${ensName}`);
  }

  const { node, txHash } = await ensureSubnode(label);
  const recordTxHashes = await setTextRecords(node, textRecords);

  return {
    ensName,
    ensLabel: label,
    textRecords,
    txHashes: [txHash, ...recordTxHashes].filter(Boolean),
  };
}

export async function updateEnsTextRecords(ensName, updates) {
  if (!isEnsConfigured() || !ensName) {
    return null;
  }

  const node = namehash(ensName);
  const txHashes = await setTextRecords(node, updates);
  return { ensName, txHashes };
}
