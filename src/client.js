import { Client, AccountId, PrivateKey } from "@hashgraph/sdk";
import "dotenv/config";

let operatorId;
let operatorKey;

function loadOperatorConfig() {
  const id = process.env.OPERATOR_ID?.trim();
  const key = process.env.OPERATOR_KEY?.trim();
  if (!id || !key) {
    throw new Error("OPERATOR_ID and OPERATOR_KEY must be set");
  }
  return { id, key };
}

export function getOperatorId() {
  if (!operatorId) {
    operatorId = AccountId.fromString(loadOperatorConfig().id);
  }
  return operatorId;
}

export function getOperatorKey() {
  if (!operatorKey) {
    operatorKey = PrivateKey.fromStringECDSA(loadOperatorConfig().key);
  }
  return operatorKey;
}

export function getClient() {
  const client = Client.forTestnet();
  client.setOperator(getOperatorId(), getOperatorKey());
  return client;
}
