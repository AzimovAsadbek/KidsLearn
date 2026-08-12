import { ValidationPipe, VersioningType } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import compression from "compression";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AllExceptionsFilter } from "./common/http/all-exceptions.filter";
import { ResponseInterceptor } from "./common/http/response.interceptor";
import type { AppConfig } from "./common/config/configuration";

/**
 * Everything the HTTP app needs between creation and listening — shared by the
 * long-running server (main.ts) and the serverless handler (serverless.ts) so
 * the two entrypoints can never drift apart.
 */
export function configureApp(app: NestExpressApplication): AppConfig {
  const config = app.get(ConfigService);
  const appConfig = config.getOrThrow<AppConfig>("app");

  // Behind one reverse proxy in production; needed for correct client IPs in
  // rate limiting and audit logs.
  app.set("trust proxy", 1);

  app.use(
    helmet({
      // The API serves JSON only; a restrictive CSP here would just be noise.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(compression());
  app.use(cookieParser());

  app.enableCors({
    origin: appConfig.corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept-Language", "X-Client-Attempt-Id"],
    exposedHeaders: ["X-Request-Id"],
    maxAge: 86_400,
  });

  app.setGlobalPrefix("api", { exclude: ["health", "health/ready"] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      validationError: { target: false, value: false },
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  // Reflector is needed by guards registered as providers in AppModule.
  void app.get(Reflector);

  const swagger = new DocumentBuilder()
    .setTitle("KidsLearn API")
    .setDescription(
      [
        "REST API for the KidsLearn platform.",
        "",
        "**Response envelope** — every success is `{ success: true, data, meta? }` and every failure is `{ success: false, error: { code, message, details? } }`.",
        "",
        "**Authentication** — send `Authorization: Bearer <accessToken>`. The refresh token is an HttpOnly cookie set by `/auth/login`; call `/auth/refresh` to rotate it.",
        "",
        "**Authorization** — `PARENT` may only reach their own children and anything hanging off them. `ADMIN` may reach everything. Ownership is enforced server-side on every child-scoped route.",
        "",
        "**Pagination** — list endpoints accept `page` and `limit` and return `meta` with `page`, `limit`, `total`, `totalPages`, `hasNext`, `hasPrevious`.",
      ].join("\n"),
    )
    .setVersion("1.0")
    .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" }, "bearer")
    .addCookieAuth("kl_refresh", { type: "apiKey", in: "cookie" }, "refreshCookie")
    .addTag("Authentication", "Registration, sessions and passwords")
    .addTag("Children", "Child profiles owned by a parent")
    .addTag("Content", "Subjects, categories and lessons")
    .addTag("Games", "Game catalogue, sessions and attempts")
    .addTag("Progress", "Progress, achievements and rewards")
    .addTag("Statistics", "Aggregated learning analytics")
    .addTag("Leaderboard", "Public standings")
    .addTag("Notifications", "In-app and push notifications")
    .addTag("Certificates", "Generated PDF certificates")
    .addTag("Media", "Object-storage backed assets")
    .addTag("AI", "Image generation and recommendations")
    .addTag("Admin", "Platform administration")
    .addTag("Platform", "Feature flags and health")
    .build();

  const document = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup("api/docs", app, document, {
    jsonDocumentUrl: "api/docs-json",
    swaggerOptions: { persistAuthorization: true, tagsSorter: "alpha", operationsSorter: "alpha" },
    customSiteTitle: "KidsLearn API",
  });

  return appConfig;
}
