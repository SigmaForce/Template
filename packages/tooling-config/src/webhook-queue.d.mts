export const webhookDeliveryQueueName: "webhook-delivery";
export const deliverWebhookJobName: "deliver-webhook";
export const webhookDeliveryJobOptions: {
  attempts: number;
  backoff: { type: "exponential"; delay: number };
  removeOnComplete: { age: number; count: number };
  removeOnFail: { age: number; count: number };
  stackTraceLimit: number;
};
export function createRedisClient(redisUrl: URL): ReturnType<typeof import("redis").createClient>;
