import "dotenv/config";
import { getClient, operatorKey } from "../src/client.js";
import { createAuditTopic } from "../src/hedera/auditLog.js";

const memo = process.argv[2] ?? "FairPass ticket audit";

const client = getClient();
try {
  const { topicId } = await createAuditTopic({ client, operatorKey, memo });
  console.log("Audit topic created:", topicId);
  console.log(`Add to .env:\nHCS_AUDIT_TOPIC_ID=${topicId}`);
  console.log(`View: https://hashscan.io/testnet/topic/${topicId}`);
} finally {
  client.close();
}
