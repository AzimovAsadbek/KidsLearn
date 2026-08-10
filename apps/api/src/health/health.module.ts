import { Controller, Get, Inject, Module, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiExcludeController, ApiOperation, ApiTags } from "@nestjs/swagger";
import type Redis from "ioredis";
import { Public } from "../common/decorators";
import { PrismaService } from "../common/prisma/prisma.service";
import { REDIS_CLIENT } from "../common/redis/redis.service";

/**
 * Liveness and readiness probes.
 *
 * `/health` answers as long as the process is up; `/health/ready` reports each
 * dependency so an orchestrator can hold traffic back until the database and
 * Redis are actually reachable.
 */
@ApiTags("Platform")
@ApiExcludeController()
// Version-neutral and outside the /api prefix so orchestrator probes have a
// stable URL that never moves with an API version bump.
@Controller({ path: "health", version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Liveness probe" })
  live() {
    return { status: "ok", uptime: Math.round(process.uptime()) };
  }

  @Public()
  @Get("ready")
  @ApiOperation({ summary: "Readiness probe" })
  async ready() {
    const [database, cache] = await Promise.all([
      this.prisma
        .$queryRaw`SELECT 1`
        .then(() => "up" as const)
        .catch(() => "down" as const),
      this.redis
        .ping()
        .then(() => "up" as const)
        .catch(() => "down" as const),
    ]);

    return { status: database === "up" ? "ok" : "degraded", database, cache };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
