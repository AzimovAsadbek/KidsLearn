import "reflect-metadata";
import "./env";
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { Express } from "express";
import { AppModule } from "./app.module";
import { configureApp } from "./bootstrap";

/**
 * Serverless entrypoint. The Nest application is created once per warm
 * instance and reused across invocations; `configureApp` keeps it identical to
 * the long-running server. Run with QUEUE_DRIVER=off — a lambda has no place
 * for BullMQ workers or cron loops.
 */
let cached: Promise<Express> | null = null;

export function getServer(): Promise<Express> {
  cached ??= (async () => {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
    app.useLogger(app.get(Logger));
    configureApp(app);
    await app.init();
    return app.getHttpAdapter().getInstance() as Express;
  })();
  return cached;
}
