import { AccountBalanceQuery } from "@hashgraph/sdk";
import { getClient, getOperatorId } from "../src/client.js";

const client = getClient();
try {
  const balance = await new AccountBalanceQuery().setAccountId(getOperatorId()).execute(client);
  console.log("Operator:", getOperatorId().toString());
  console.log("Balance :", balance.hbars.toString());
} finally {
  client.close();
}