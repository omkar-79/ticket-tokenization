import { Client, AccountId, PrivateKey } from "@hashgraph/sdk";
import "dotenv/config";

export const operatorId = AccountId.fromString(process.env.OPERATOR_ID);
export const operatorKey = PrivateKey.fromStringECDSA(process.env.OPERATOR_KEY);

export function getClient() {
  const client = Client.forTestnet();
  client.setOperator(operatorId, operatorKey);
  return client;
}