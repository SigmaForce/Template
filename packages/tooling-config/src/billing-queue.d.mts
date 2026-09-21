export const billingProjectionQueueName: "billing-projection";
export const projectStripeSubscriptionJobName: "project-stripe-subscription";
export const billingProjectionJobOptions: {
  attempts: number;
  backoff: { type: "exponential"; delay: number };
  removeOnComplete: { age: number; count: number };
  removeOnFail: { age: number; count: number };
  stackTraceLimit: number;
};
export function createRedisClient(
  redisUrl: URL,
): ReturnType<typeof createClient>;
import { createClient } from "redis";
