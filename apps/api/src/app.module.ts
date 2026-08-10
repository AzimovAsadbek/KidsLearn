import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

import { loadConfiguration, type AppConfig, type Configuration } from "./common/config/configuration";
import { PrismaModule } from "./common/prisma/prisma.module";
import { RedisModule } from "./common/redis/redis.module";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { RolesGuard } from "./auth/guards/roles.guard";
import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { ChildrenModule } from "./children/children.module";
import { ContentModule } from "./content/content.module";
import { GamesModule } from "./games/games.module";
import { MediaModule } from "./media/media.module";
import { ProgressModule } from "./progress/progress.module";
import { FeatureFlagsModule } from "./feature-flags/feature-flags.module";
import { AuditModule } from "./audit/audit.module";
import { QueueModule } from "./queue/queue.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // The repo root .env is the single source for every workspace app.
      envFilePath: [join(process.cwd(), ".env"), join(process.cwd(), "../../.env")],
      load: [loadConfiguration],
      cache: true,
    }),

    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const app = config.getOrThrow<AppConfig>("app");
        return {
          pinoHttp: {
            level: app.logLevel,
            genReqId: (req, res) => {
              const existing = req.headers["x-request-id"];
              const id = typeof existing === "string" && existing ? existing : randomUUID();
              res.setHeader("X-Request-Id", id);
              return id;
            },
            // Structured logs must never carry credentials or tokens.
            redact: {
              paths: [
                "req.headers.authorization",
                "req.headers.cookie",
                "res.headers['set-cookie']",
                "req.body.password",
                "req.body.newPassword",
                "req.body.currentPassword",
                "req.body.token",
              ],
              remove: true,
            },
            customProps: (req) => ({ userId: (req as { user?: { id: string } }).user?.id }),
            autoLogging: { ignore: (req) => req.url === "/health" || req.url === "/health/ready" },
            transport:
              app.env === "development"
                ? { target: "pino-pretty", options: { singleLine: true, translateTime: "HH:MM:ss" } }
                : undefined,
          },
        };
      },
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const throttle = config.getOrThrow<Configuration["throttle"]>("throttle");
        return {
          throttlers: [
            { name: "default", ttl: throttle.ttl * 1000, limit: throttle.limit },
            // Named bucket the auth endpoints opt into with @Throttle.
            { name: "auth", ttl: 60_000, limit: throttle.authLimit },
          ],
        };
      },
    }),

    ScheduleModule.forRoot(),

    PrismaModule,
    RedisModule,
    QueueModule,
    AuditModule,
    FeatureFlagsModule,
    AuthModule,
    ChildrenModule,
    ContentModule,
    GamesModule,
    MediaModule,
    ProgressModule,
    HealthModule,
  ],
  providers: [
    // Order matters: authenticate, then authorise, with rate limiting outermost.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
