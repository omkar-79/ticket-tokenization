import {
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
} from "@hashgraph/sdk";

const MAX_MESSAGE_BYTES = 1024;

export async function createAuditTopic({ client, operatorKey, memo = "FairPass ticket audit" }) {
  let tx = new TopicCreateTransaction()
    .setTopicMemo(memo)
    .setAdminKey(operatorKey.publicKey)
    .setSubmitKey(operatorKey.publicKey)
    .freezeWith(client);

  tx = await tx.sign(operatorKey);

  const receipt = await (await tx.execute(client)).getReceipt(client);
  const topicId = receipt.topicId?.toString();
  if (!topicId) {
    throw new Error("Topic creation did not return a topicId");
  }

  return { topicId };
}

export async function submitAuditEvent({ client, topicId, operatorKey, payload }) {
  const message = JSON.stringify(payload);
  const byteLength = Buffer.byteLength(message, "utf8");
  if (byteLength > MAX_MESSAGE_BYTES) {
    throw new Error(`Audit message exceeds ${MAX_MESSAGE_BYTES} bytes (${byteLength})`);
  }

  let tx = new TopicMessageSubmitTransaction()
    .setTopicId(topicId)
    .setMessage(message)
    .freezeWith(client);

  tx = await tx.sign(operatorKey);

  const response = await tx.execute(client);
  const receipt = await response.getReceipt(client);
  const topicSequence = receipt.topicSequenceNumber?.toNumber?.() ?? receipt.topicSequenceNumber;

  return {
    topicSequence,
    txId: response.transactionId.toString(),
  };
}
