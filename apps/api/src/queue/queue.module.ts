import { Global, Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";

/** Every background queue in the system, named in one place. */
export const QUEUES = {
  NOTIFICATIONS: "notifications",
  AI: "ai",
  CERTIFICATES: "certificates",
  AGGREGATION: "aggregation",
} as const;

export const JOBS = {
  SEND_PUSH: "send-push",
  DAILY_REMINDER: "daily-reminder",
  WEEKLY_REPORT: "weekly-report",
  NEW_LESSON_BROADCAST: "new-lesson-broadcast",
  BROADCAST_PUSH: "broadcast-push",
  GENERATE_IMAGE: "generate-image",
  GENERATE_RECOMMENDATION: "generate-recommendation",
  RENDER_CERTIFICATE: "render-certificate",
  REBUILD_LEADERBOARD: "rebuild-leaderboard",
  PRUNE_TOKENS: "prune-tokens",
} as const;

/**
 * Shared BullMQ configuration.
 *
 * Retries use exponential backoff and completed jobs are trimmed so Redis does
 * not grow without bound. Handlers are additionally written to be idempotent,
 * because at-least-once delivery means a retry can re-run a job that already
 * had an effect.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = new URL(config.get<string>("redisUrl") ?? "redis://localhost:6379");
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port || 6379),
            password: url.password || undefined,
            // BullMQ requires blocking commands, which need retries disabled.
            maxRetriesPerRequest: null,
          },
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
            removeOnComplete: { age: 3600, count: 500 },
            removeOnFail: { age: 86_400 },
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: QUEUES.NOTIFICATIONS },
      { name: QUEUES.AI },
      { name: QUEUES.CERTIFICATES },
      { name: QUEUES.AGGREGATION },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
