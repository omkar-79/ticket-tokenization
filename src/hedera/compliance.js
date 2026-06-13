import {
  TokenFreezeTransaction, TokenUnfreezeTransaction,
  TokenPauseTransaction, TokenUnpauseTransaction,
  PrivateKey,
} from "@hashgraph/sdk";
import { getClient } from "../client.js";

// Freeze an ACCOUNT for a TOKEN: that account can no longer transfer ANY of
// this token (account-level, not per-serial). Used at gate entry so a used
// ticket can't be resold. Signed by the freeze key.
export async function freezeHolder({ tokenId, accountId, freezeKeyDer }) {
  const client = getClient();
  try {
    const freezeKey = PrivateKey.fromStringDer(freezeKeyDer);
    const tx = await new TokenFreezeTransaction()
      .setAccountId(accountId)
      .setTokenId(tokenId)
      .freezeWith(client)
      .sign(freezeKey);
    const receipt = await (await tx.execute(client)).getReceipt(client);
    return { status: receipt.status.toString() };
  } finally {
    client.close();
  }
}

// Reverse a freeze (handy for re-running tests).
export async function unfreezeHolder({ tokenId, accountId, freezeKeyDer }) {
  const client = getClient();
  try {
    const freezeKey = PrivateKey.fromStringDer(freezeKeyDer);
    const tx = await new TokenUnfreezeTransaction()
      .setAccountId(accountId)
      .setTokenId(tokenId)
      .freezeWith(client)
      .sign(freezeKey);
    const receipt = await (await tx.execute(client)).getReceipt(client);
    return { status: receipt.status.toString() };
  } finally {
    client.close();
  }
}

// Pause the WHOLE token: no transfers or mints for anyone until unpaused.
// Per-token (= per-match if you use one token per match). Signed by the pause key.
export async function pauseToken({ tokenId, pauseKeyDer }) {
  const client = getClient();
  try {
    const pauseKey = PrivateKey.fromStringDer(pauseKeyDer);
    const tx = await new TokenPauseTransaction()
      .setTokenId(tokenId)
      .freezeWith(client)
      .sign(pauseKey);
    const receipt = await (await tx.execute(client)).getReceipt(client);
    return { status: receipt.status.toString() };
  } finally {
    client.close();
  }
}

export async function unpauseToken({ tokenId, pauseKeyDer }) {
  const client = getClient();
  try {
    const pauseKey = PrivateKey.fromStringDer(pauseKeyDer);
    const tx = await new TokenUnpauseTransaction()
      .setTokenId(tokenId)
      .freezeWith(client)
      .sign(pauseKey);
    const receipt = await (await tx.execute(client)).getReceipt(client);
    return { status: receipt.status.toString() };
  } finally {
    client.close();
  }
}