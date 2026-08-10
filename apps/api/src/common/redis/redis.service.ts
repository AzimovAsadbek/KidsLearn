import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

export const REDIS_CLIENT = Symbol("REDIS_CLIENT");

/**
 * Thin cache facade over Redis.
 *
 * Every read degrades to a miss and every write to a no-op if Redis is
 * unavailable — caching must never be the reason a page fails to render.
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private healthy = true;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    this.redis.on("error", (error: Error) => {
      if (this.healthy) {
        this.healthy = false;
        this.logger.warn(`Redis unavailable, serving without cache: ${error.message}`);
      }
    });
    this.redis.on("ready", () => {
      this.healthy = true;
    });
  }

  get client(): Redis {
    return this.redis;
  }

  get isHealthy(): boolean {
    return this.healthy;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.healthy) return null;
    try {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (!this.healthy) return;
    try {
      await this.redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch {
      /* cache writes are best-effort */
    }
  }

  /** Read-through helper: compute on miss, cache, return. */
  async remember<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const fresh = await factory();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  async del(...keys: string[]): Promise<void> {
    if (!this.healthy || keys.length === 0) return;
    try {
      await this.redis.del(...keys);
    } catch {
      /* ignore */
    }
  }

  /**
   * Invalidates a namespace. Uses SCAN rather than KEYS so a large keyspace
   * never blocks the Redis event loop.
   */
  async invalidatePrefix(prefix: string): Promise<void> {
    if (!this.healthy) return;
    try {
      let cursor = "0";
      do {
        const [next, found] = await this.redis.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 200);
        cursor = next;
        if (found.length > 0) await this.redis.del(...found);
      } while (cursor !== "0");
    } catch {
      /* ignore */
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit().catch(() => undefined);
  }
}

/** Cache key builders — one place, so invalidation can't miss a variant. */
export const CacheKeys = {
  featureFlags: () => "flags:all",
  subjects: (locale: string) => `subjects:${locale}`,
  publishedLessons: (fingerprint: string) => `lessons:published:${fingerprint}`,
  lessonsPrefix: () => "lessons:",
  leaderboard: (period: string, bucket: string) => `leaderboard:${period}:${bucket}`,
  leaderboardPrefix: () => "leaderboard:",
  statistics: (childId: string, fingerprint: string) => `stats:${childId}:${fingerprint}`,
  statisticsPrefix: (childId: string) => `stats:${childId}:`,
  adminAnalytics: (fingerprint: string) => `admin:analytics:${fingerprint}`,
} as const;
