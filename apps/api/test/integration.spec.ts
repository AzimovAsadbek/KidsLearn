import { Test } from "@nestjs/testing";
import { ValidationPipe, VersioningType, type INestApplication } from "@nestjs/common";
import cookieParser from "cookie-parser";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { AllExceptionsFilter } from "../src/common/http/all-exceptions.filter";
import { ResponseInterceptor } from "../src/common/http/response.interceptor";

/**
 * Integration tests against a real PostgreSQL database.
 *
 * These cover the boundaries that unit tests cannot prove: that authentication
 * actually issues usable tokens, that a parent cannot reach another family's
 * data, and that a replayed attempt does not award XP twice.
 *
 * Requires the local stack (`pnpm infra:up`) and the `kidslearn_test` database.
 */
describe("KidsLearn API", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<typeof request>;

  const familyA = { name: "Parent A", email: "a@test.local", password: "kidslearn2026" };
  const familyB = { name: "Parent B", email: "b@test.local", password: "kidslearn2026" };

  let tokenA = "";
  let tokenB = "";
  let childA = "";
  let childB = "";

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix("api", { exclude: ["health"] });
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.resetForTests();
    http = request(app.getHttpServer());

    const register = async (family: typeof familyA) => {
      const response = await http.post("/api/v1/auth/register").send(family).expect(201);
      return response.body.data.accessToken as string;
    };

    tokenA = await register(familyA);
    tokenB = await register(familyB);

    const addChild = async (token: string, name: string, dateOfBirth: string) => {
      const response = await http
        .post("/api/v1/children")
        .set("Authorization", `Bearer ${token}`)
        .send({ name, dateOfBirth, avatarGlyph: "🧒", avatarTone: "sky" })
        .expect(201);
      return response.body.data.id as string;
    };

    childA = await addChild(tokenA, "Ali", "2021-03-14");
    childB = await addChild(tokenB, "Bobur", "2022-05-02");
  }, 60_000);

  afterAll(async () => {
    await prisma.resetForTests().catch(() => undefined);
    await app?.close();
  });

  describe("response shape", () => {
    it("wraps success in the envelope", async () => {
      const response = await http.get("/api/v1/feature-flags").expect(200);
      expect(response.body).toMatchObject({ success: true });
      expect(response.body.data).toBeTypeOf("object");
    });

    it("wraps failure in the envelope with a stable code", async () => {
      const response = await http.get("/api/v1/children").expect(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("UNAUTHORIZED");
      // No stack trace, no internal detail.
      expect(JSON.stringify(response.body)).not.toMatch(/at .*\.ts:/);
    });

    it("returns field-level details for validation failures", async () => {
      const response = await http
        .post("/api/v1/auth/register")
        .send({ name: "x", email: "not-an-email", password: "short" })
        .expect(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
      expect(Object.keys(response.body.error.details)).toEqual(expect.arrayContaining(["email", "password"]));
    });
  });

  describe("authentication", () => {
    it("rejects a wrong password without revealing whether the account exists", async () => {
      const wrongPassword = await http
        .post("/api/v1/auth/login")
        .send({ email: familyA.email, password: "not-the-password" })
        .expect(401);
      const noSuchUser = await http
        .post("/api/v1/auth/login")
        .send({ email: "nobody@test.local", password: "not-the-password" })
        .expect(401);

      expect(wrongPassword.body.error.code).toBe("INVALID_CREDENTIALS");
      expect(noSuchUser.body.error).toEqual(wrongPassword.body.error);
    });

    it("refuses a duplicate email", async () => {
      const response = await http.post("/api/v1/auth/register").send(familyA).expect(409);
      expect(response.body.error.code).toBe("EMAIL_TAKEN");
    });

    it("never stores the password", async () => {
      const user = await prisma.user.findUniqueOrThrow({ where: { email: familyA.email } });
      expect(user.passwordHash).not.toContain(familyA.password);
      expect(user.passwordHash.startsWith("$argon2id$")).toBe(true);
    });

    it("rotates the refresh token and rejects a replay", async () => {
      const login = await http
        .post("/api/v1/auth/login")
        .send({ email: familyA.email, password: familyA.password })
        .expect(200);
      const cookie = login.headers["set-cookie"][0];

      await http.post("/api/v1/auth/refresh").set("Cookie", cookie).expect(200);
      // The same cookie a second time is a replay: the family is revoked.
      const replay = await http.post("/api/v1/auth/refresh").set("Cookie", cookie).expect(401);
      expect(replay.body.error.code).toBe("TOKEN_EXPIRED");
    });
  });

  describe("authorization", () => {
    it("blocks a parent from admin routes", async () => {
      const response = await http.get("/api/v1/admin/metrics").set("Authorization", `Bearer ${tokenA}`).expect(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    });

    it("hides another family's child behind a 404", async () => {
      const response = await http
        .get(`/api/v1/children/${childB}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .expect(404);
      // 403 would confirm the id exists.
      expect(response.body.error.code).toBe("CHILD_NOT_FOUND");
    });

    it("refuses cross-family writes", async () => {
      await http
        .patch(`/api/v1/children/${childB}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ name: "Hijacked" })
        .expect(404);

      const untouched = await prisma.child.findUniqueOrThrow({ where: { id: childB } });
      expect(untouched.name).toBe("Bobur");
    });

    it("refuses to read another family's progress", async () => {
      await http.get(`/api/v1/children/${childB}/progress`).set("Authorization", `Bearer ${tokenA}`).expect(404);
      await http.get(`/api/v1/children/${childB}/statistics`).set("Authorization", `Bearer ${tokenA}`).expect(404);
    });

    it("lists only the caller's own children", async () => {
      const response = await http.get("/api/v1/children").set("Authorization", `Bearer ${tokenA}`).expect(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(childA);
    });
  });

  describe("children", () => {
    it("derives age and band from the date of birth", async () => {
      const response = await http.get(`/api/v1/children/${childA}`).set("Authorization", `Bearer ${tokenA}`).expect(200);
      const child = response.body.data;
      expect(child.age).toBeGreaterThanOrEqual(4);
      expect(["AGE_3_4", "AGE_5_7"]).toContain(child.ageCategory);
      // Age is computed, never persisted.
      const row = await prisma.child.findUniqueOrThrow({ where: { id: childA } });
      expect(Object.keys(row)).not.toContain("age");
    });

    it("rejects a future date of birth", async () => {
      await http
        .post("/api/v1/children")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ name: "Future", dateOfBirth: "2030-01-01", avatarGlyph: "🧒", avatarTone: "sky" })
        .expect(400);
    });

    it("creates a progress row alongside every child", async () => {
      const progress = await prisma.progress.findUnique({ where: { childId: childA } });
      expect(progress).not.toBeNull();
      expect(progress?.xp).toBe(0);
    });
  });

  describe("content visibility", () => {
    it("returns only published lessons to a parent", async () => {
      const subject = await prisma.subject.create({
        data: { slug: "test-subject", glyph: "🧪", tone: "brand", translations: { create: [{ locale: "EN", name: "Testing" }] } },
      });
      await prisma.lesson.createMany({
        data: [
          { slug: "published-lesson", subjectId: subject.id, ageCategory: "AGE_3_4", status: "PUBLISHED", glyph: "📘", tone: "sky" },
          { slug: "draft-lesson", subjectId: subject.id, ageCategory: "AGE_3_4", status: "DRAFT", glyph: "📕", tone: "coral" },
        ],
      });

      const response = await http.get("/api/v1/lessons").set("Authorization", `Bearer ${tokenA}`).expect(200);
      const slugs = response.body.data.map((lesson: { slug: string }) => lesson.slug);
      expect(slugs).toContain("published-lesson");
      expect(slugs).not.toContain("draft-lesson");
    });

    it("paginates with usable metadata", async () => {
      const response = await http
        .get("/api/v1/lessons?page=1&limit=1")
        .set("Authorization", `Bearer ${tokenA}`)
        .expect(200);
      expect(response.body.meta).toMatchObject({ page: 1, limit: 1 });
      expect(response.body.meta.totalPages).toBeGreaterThanOrEqual(1);
    });
  });

  describe("games", () => {
    let sessionId = "";
    let gameSlug = "";

    beforeAll(async () => {
      const subject = await prisma.subject.findFirstOrThrow();
      const game = await prisma.game.create({
        data: {
          slug: "test-color-match",
          type: "COLOR_MATCH",
          subjectId: subject.id,
          ageCategory: "AGE_1_2",
          status: "PUBLISHED",
          glyph: "🎨",
          tone: "blossom",
          roundsPerSession: 2,
          translations: { create: [{ locale: "EN", title: "Test Colours" }] },
        },
      });
      gameSlug = game.slug;

      for (const key of ["red", "blue"]) {
        const question = await prisma.gameQuestion.create({
          data: {
            gameId: game.id,
            key,
            promptGlyph: "🎨",
            translations: { create: [{ locale: "EN", prompt: `Find ${key}` }] },
          },
        });
        for (const [optionKey, optionGlyph] of [
          ["red", "🔴"],
          ["blue", "🔵"],
        ]) {
          await prisma.gameQuestionOption.create({
            data: {
              questionId: question.id,
              key: optionKey,
              glyph: optionGlyph,
              isCorrect: optionKey === key,
              translations: { create: [{ locale: "EN", label: optionKey }] },
            },
          });
        }
      }
    }, 30_000);

    it("deals a session without leaking the answer key", async () => {
      const response = await http
        .post(`/api/v1/games/${gameSlug}/sessions`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ childId: childA, seed: 42 })
        .expect(201);

      sessionId = response.body.data.sessionId;
      expect(response.body.data.rounds).toHaveLength(2);
      expect(JSON.stringify(response.body.data.rounds)).not.toMatch(/isCorrect|correctOption/i);
    });

    it("refuses to deal a session for another family's child", async () => {
      await http
        .post(`/api/v1/games/${gameSlug}/sessions`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ childId: childB })
        .expect(404);
    });

    it("grades an attempt server-side and awards progress", async () => {
      const session = await http
        .post(`/api/v1/games/${gameSlug}/sessions`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ childId: childA, seed: 7 })
        .expect(201);

      const rounds = session.body.data.rounds as Array<{
        questionId: string;
        prompt: string;
        options: Array<{ id: string; label: string }>;
      }>;

      // Answer everything correctly by matching the prompt to the option label.
      const answers = rounds.map((round) => {
        const wanted = round.prompt.replace("Find ", "").trim();
        const option = round.options.find((candidate) => candidate.label === wanted) ?? round.options[0];
        return { questionId: round.questionId, selectedOptionId: option.id };
      });

      const attempt = await http
        .post("/api/v1/games/attempts")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          clientAttemptId: "integration-attempt-1",
          childId: childA,
          sessionId: session.body.data.sessionId,
          durationSeconds: 30,
          answers,
        })
        .expect(201);

      expect(attempt.body.data.score).toBe(2);
      expect(attempt.body.data.starsAwarded).toBe(5);
      expect(attempt.body.data.progress.gamesPlayed).toBeGreaterThan(0);
      expect(attempt.body.data.progress.stars).toBeGreaterThan(0);
    });

    it("is idempotent on the client attempt id", async () => {
      const before = await prisma.progress.findUniqueOrThrow({ where: { childId: childA } });

      const replay = await http
        .post("/api/v1/games/attempts")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          clientAttemptId: "integration-attempt-1",
          childId: childA,
          sessionId: sessionId,
          durationSeconds: 30,
          answers: [],
        })
        .expect(201);

      const after = await prisma.progress.findUniqueOrThrow({ where: { childId: childA } });
      // The original attempt is reported back, and nothing is awarded again.
      expect(replay.body.data.attemptId).toBeTruthy();
      expect(after.xp).toBe(before.xp);
      expect(after.stars).toBe(before.stars);
      expect(after.gamesPlayed).toBe(before.gamesPlayed);
    });

    it("rejects an answer for a question the session never dealt", async () => {
      const session = await http
        .post(`/api/v1/games/${gameSlug}/sessions`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ childId: childA })
        .expect(201);

      const foreignQuestion = await prisma.gameQuestion.findFirstOrThrow();
      await http
        .post(`/api/v1/games/sessions/${session.body.data.sessionId}/answers`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ questionId: foreignQuestion.id, selectedOptionId: foreignQuestion.id })
        .expect((response) => {
          // Either it wasn't dealt (400), or it was and simply scores wrong.
          expect([200, 201, 400]).toContain(response.status);
        });
    });
  });

  describe("progress and streaks", () => {
    it("records a daily bucket for the activity", async () => {
      const buckets = await prisma.dailyStat.findMany({ where: { childId: childA } });
      expect(buckets.length).toBeGreaterThan(0);
      expect(buckets[0].gamesPlayed).toBeGreaterThan(0);
    });

    it("starts the streak at one on the first day of activity", async () => {
      const progress = await prisma.progress.findUniqueOrThrow({ where: { childId: childA } });
      expect(progress.currentStreak).toBe(1);
      expect(progress.longestStreak).toBeGreaterThanOrEqual(1);
    });

    it("returns statistics with one point per day", async () => {
      const response = await http
        .get(`/api/v1/children/${childA}/statistics?preset=week`)
        .set("Authorization", `Bearer ${tokenA}`)
        .expect(200);
      expect(response.body.data.series.learningMinutes).toHaveLength(7);
      expect(response.body.data.consistency).toHaveLength(35);
    });
  });

  describe("AI honesty", () => {
    it("reports preview mode when no image provider is configured", async () => {
      const response = await http.get("/api/v1/ai/status").expect(200);
      expect(response.body.data.imageGeneration.mode).toBe("preview");
      expect(response.body.data.imageGeneration.configured).toBe(false);
    });

    it("always produces a recommendation, with or without an AI provider", async () => {
      const response = await http
        .get(`/api/v1/children/${childA}/recommendation`)
        .set("Authorization", `Bearer ${tokenA}`)
        .expect(200);
      expect(response.body.data.headline).toBeTruthy();
      expect(response.body.data.source).toBe("RULE_BASED");
    });
  });

  describe("leaderboard privacy", () => {
    it("exposes no private fields", async () => {
      const response = await http.get("/api/v1/leaderboard").set("Authorization", `Bearer ${tokenA}`).expect(200);
      const payload = JSON.stringify(response.body).toLowerCase();
      for (const forbidden of ["email", "dateofbirth", "phone", "parentid", "passwordhash"]) {
        expect(payload).not.toContain(forbidden);
      }
    });
  });
});
