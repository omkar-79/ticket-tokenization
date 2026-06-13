import { TokenMintTransaction, PrivateKey } from "@hashgraph/sdk";
import { getClient } from "../client.js";

function parseSupplyKey(supplyKeyDer) {
  if (supplyKeyDer.startsWith("0x")) {
    return PrivateKey.fromStringECDSA(supplyKeyDer);
  }
  return PrivateKey.fromStringDer(supplyKeyDer);
}

export async function mintTickets(tokenId, supplyKeyDer, metadataPointers) {
  const client = getClient();
  const supplyKey = parseSupplyKey(supplyKeyDer);

  try {
    const metadata = metadataPointers.map((pointer) => {
      const buf = Buffer.from(pointer);
      if (buf.length > 100) {
        throw new Error(`Metadata pointer exceeds 100 bytes: ${pointer}`);
      }
      return buf;
    });

    let tx = await new TokenMintTransaction()
      .setTokenId(tokenId)
      .setMetadata(metadata)
      .freezeWith(client);

    tx = await tx.sign(supplyKey);

    const receipt = await (await tx.execute(client)).getReceipt(client);
    const serials = receipt.serials.map((s) => s.toString());
    return { serials };
  } finally {
    client.close();
  }
}
