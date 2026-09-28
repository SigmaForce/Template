export const notificationQueueName: "notifications";
export const sendNotificationJobName: "send-notification";
export const notificationJobOptions: { attempts: number; backoff: { type: "exponential"; delay: number }; removeOnComplete: { age: number; count: number }; removeOnFail: { age: number; count: number }; stackTraceLimit: number };
export function createRedisClient(redisUrl: URL): ReturnType<typeof import("redis").createClient>;
