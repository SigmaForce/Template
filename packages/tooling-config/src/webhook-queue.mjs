export const webhookDeliveryQueueName = "webhook-delivery";
export const deliverWebhookJobName = "deliver-webhook";
export const webhookDeliveryJobOptions = {
  attempts: 5,
  backoff: { type: "exponential", delay: 1_000 },
  removeOnComplete: { age: 3_600, count: 1_000 },
  removeOnFail: { age: 604_800, count: 1_000 },
  stackTraceLimit: 5,
};
export { createRedisClient } from "./billing-queue.mjs";
