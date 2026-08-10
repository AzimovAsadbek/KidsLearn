import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { CacheService, REDIS_CLIENT } from "./redis.service";

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>("redisUrl") ?? "redis://localhost:6379";
        return new Redis(url, {
          // Fail fast and keep serving from the database rather than hanging
          // requests while Redis is down.
          maxRetriesPerRequest: 2,
          enableOfflineQueue: false,
          lazyConnect: false,
          retryStrategy: (attempt) => Math.min(attempt * 500, 5000),
        });
      },
    },
    CacheService,
  ],
  exports: [CacheService, REDIS_CLIENT],
})
export class RedisModule {}
