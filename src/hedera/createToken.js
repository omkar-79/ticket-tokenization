import {
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  CustomRoyaltyFee,
  CustomFixedFee,
  Hbar,
  PrivateKey,
  AccountId,
} from "@hashgraph/sdk";
import { getClient } from "../client.js";

function parsePrivateKey(keyString) {
  if (keyString.startsWith("0x")) {
    return PrivateKey.fromStringECDSA(keyString);
  }
  return PrivateKey.fromStringDer(keyString);
}

export async function createTicketToken({
  organizerAccountId,
  organizerPrivateKey,
  maxSupply = 10000,
  name = "WorldCup Ticket",
  symbol = "WCT",
  royaltyNumerator = 10,
  royaltyDenominator = 100,
}) {
  const client = getClient();
  const organizerId = AccountId.fromString(organizerAccountId);
  const organizerKey = parsePrivateKey(organizerPrivateKey);

  try {
    const adminKey = PrivateKey.generateECDSA();
    const supplyKey = PrivateKey.generateECDSA();
    const freezeKey = PrivateKey.generateECDSA();
    const pauseKey = PrivateKey.generateECDSA();
    const metadataKey = PrivateKey.generateECDSA();

    const royalty = new CustomRoyaltyFee()
      .setNumerator(royaltyNumerator)
      .setDenominator(royaltyDenominator)
      .setFeeCollectorAccountId(organizerId)
      .setFallbackFee(new CustomFixedFee().setHbarAmount(new Hbar(5)));

    let tx = new TokenCreateTransaction()
      .setTokenName(name)
      .setTokenSymbol(symbol)
      .setTokenType(TokenType.NonFungibleUnique)
      .setSupplyType(TokenSupplyType.Finite)
      .setMaxSupply(maxSupply)
      .setInitialSupply(0)
      .setTreasuryAccountId(organizerId)
      .setAdminKey(adminKey.publicKey)
      .setSupplyKey(supplyKey.publicKey)
      .setFreezeKey(freezeKey.publicKey)
      .setPauseKey(pauseKey.publicKey)
      .setMetadataKey(metadataKey.publicKey)
      .setCustomFees([royalty])
      .freezeWith(client);

    tx = await tx.sign(adminKey);
    tx = await tx.sign(organizerKey);

    const receipt = await (await tx.execute(client)).getReceipt(client);
    const tokenId = receipt.tokenId.toString();

    return {
      tokenId,
      keys: {
        admin: adminKey.toStringDer(),
        supply: supplyKey.toStringDer(),
        freeze: freezeKey.toStringDer(),
        pause: pauseKey.toStringDer(),
        metadata: metadataKey.toStringDer(),
      },
    };
  } finally {
    client.close();
  }
}
