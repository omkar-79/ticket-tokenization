import { TransferTransaction, Hbar, AccountId } from "@hashgraph/sdk";
import { getClient, operatorId } from "../client.js";

export async function fundUserAccount(recipientAccountId, amountHbar) {
  const client = getClient();
  try {
    const tx = await new TransferTransaction()
      .addHbarTransfer(operatorId, new Hbar(-amountHbar))
      .addHbarTransfer(AccountId.fromString(recipientAccountId), new Hbar(amountHbar))
      .execute(client);
    const receipt = await tx.getReceipt(client);
    return {
      status: receipt.status.toString(),
      transactionId: tx.transactionId.toString(),
      hashscanUrl: `https://hashscan.io/testnet/transaction/${tx.transactionId.toString()}`,
    };
  } finally {
    client.close();
  }
}
