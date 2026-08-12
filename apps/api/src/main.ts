import "reflect-metadata";
import "./env";
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { configureApp } from "./bootstrap";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const appConfig = configureApp(app);

  await app.listen(appConfig.port, "0.0.0.0");
  console.log(`KidsLearn API listening on http://localhost:${appConfig.port}/api/v1 (docs: /api/docs)`);
}

bootstrap().catch((error: unknown) => {
  // Startup failures must be visible even though logs are buffered until the
  // logger is attached; otherwise the process just exits in silence.
  console.error("Failed to start KidsLearn API:", error);
  process.exit(1);
});
