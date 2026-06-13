import { AccountBalanceQuery } from "@hashgraph/sdk";
import { getClient, operatorId } from "../src/client.js";

const client = getClient();
try {
  const balance = await new AccountBalanceQuery().setAccountId(operatorId).execute(client);
  console.log("Operator:", operatorId.toString());
  console.log("Balance :", balance.hbars.toString());
} finally {
  client.close();
}