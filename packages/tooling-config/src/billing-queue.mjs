export const billingProjectionQueueName = "billing-projection";
export const projectStripeSubscriptionJobName = "project-stripe-subscription";

export const billingProjectionJobOptions = {
  attempts: 5,
  backoff: { type: "exponential", delay: 1_000 },
  removeOnComplete: { age: 3_600, count: 1_000 },
  removeOnFail: { age: 604_800, count: 1_000 },
  stackTraceLimit: 5,
};

export function createRedisClient(redisUrl) {
  return createClient({ url: redisUrl.toString() });
}
import { createClient } from "redis";
