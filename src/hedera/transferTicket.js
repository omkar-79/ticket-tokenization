import {
  TransferTransaction,
  Hbar,
  PrivateKey,
  AccountId,
  TokenId,
} from "@hashgraph/sdk";
import { getClient } from "../client.js";

function parsePrivateKey(keyString) {
  if (keyString.startsWith("0x")) {
    return PrivateKey.fromStringECDSA(keyString);
  }
  return PrivateKey.fromStringDer(keyString);
}

export async function primarySale({
  tokenId,
  serial,
  sellerAccountId,
  sellerPrivateKey,
  buyerAccountId,
  buyerPrivateKey,
  priceHbar,
}) {
  const client = getClient();
  const sellerKey = parsePrivateKey(sellerPrivateKey);

  try {
    let tx = new TransferTransaction()
      .addNftTransfer(
        TokenId.fromString(tokenId),
        serial,
        AccountId.fromString(sellerAccountId),
        AccountId.fromString(buyerAccountId)
      );

    if (priceHbar > 0) {
      tx = tx
        .addHbarTransfer(AccountId.fromString(buyerAccountId), new Hbar(-priceHbar))
        .addHbarTransfer(AccountId.fromString(sellerAccountId), new Hbar(priceHbar));
    }

    tx = await tx.freezeWith(client).sign(sellerKey);

    if (buyerPrivateKey && priceHbar > 0) {
      tx = await tx.sign(parsePrivateKey(buyerPrivateKey));
    }

    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);
    return { txId: response.transactionId.toString(), status: receipt.status.toString() };
  } finally {
    client.close();
  }
}

export async function atomicResale({
  tokenId,
  serial,
  sellerAccountId,
  sellerPrivateKey,
  buyerAccountId,
  buyerPrivateKey,
  priceHbar,
}) {
  const client = getClient();
  const sellerKey = parsePrivateKey(sellerPrivateKey);
  const buyerKey = parsePrivateKey(buyerPrivateKey);

  try {
    let tx = await new TransferTransaction()
      .addNftTransfer(
        TokenId.fromString(tokenId),
        serial,
        AccountId.fromString(sellerAccountId),
        AccountId.fromString(buyerAccountId)
      )
      .addHbarTransfer(AccountId.fromString(buyerAccountId), new Hbar(-priceHbar))
      .addHbarTransfer(AccountId.fromString(sellerAccountId), new Hbar(priceHbar))
      .freezeWith(client)
      .sign(sellerKey);

    tx = await tx.sign(buyerKey);

    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);
    return { txId: response.transactionId.toString(), status: receipt.status.toString() };
  } finally {
    client.close();
  }
}
