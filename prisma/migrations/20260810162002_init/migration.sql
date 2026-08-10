-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PARENT');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('UZ', 'RU', 'EN');

-- CreateEnum
CREATE TYPE "AgeCategory" AS ENUM ('AGE_1_2', 'AGE_3_4', 'AGE_5_7');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('COLOR_MATCH', 'ANIMAL_SOUNDS', 'LETTER_MATCH', 'NUMBER_GAME', 'PUZZLE', 'MEMORY');

-- CreateEnum
CREATE TYPE "LessonBlockType" AS ENUM ('TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'QUESTION', 'INTERACTION', 'ANIMATION');

-- CreateEnum
CREATE TYPE "MedalTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'DIAMOND');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('LESSON_REMINDER', 'NEW_LESSON', 'REWARD_EARNED', 'ACHIEVEMENT_EARNED', 'STREAK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('LESSON_STARTED', 'LESSON_COMPLETED', 'GAME_PLAYED', 'ACHIEVEMENT_EARNED', 'REWARD_CLAIMED', 'STREAK_EXTENDED', 'CERTIFICATE_ISSUED');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'AVATAR', 'GENERATED', 'CERTIFICATE');

-- CreateEnum
CREATE TYPE "AiJobType" AS ENUM ('IMAGE_GENERATION', 'RECOMMENDATION');

-- CreateEnum
CREATE TYPE "AiJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'AWAITING_REVIEW', 'APPROVED', 'REJECTED', 'FAILED', 'PREVIEW_ONLY');

-- CreateEnum
CREATE TYPE "RecommendationSource" AS ENUM ('RULE_BASED', 'AI');

-- CreateEnum
CREATE TYPE "LeaderboardPeriod" AS ENUM ('WEEKLY', 'MONTHLY', 'ALL_TIME');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PARENT',
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "locale" "Locale" NOT NULL DEFAULT 'EN',
    "phone" TEXT,
    "avatarGlyph" TEXT NOT NULL DEFAULT '🧑',
    "avatarTone" TEXT NOT NULL DEFAULT 'brand',
    "emailVerifiedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tashkent',
    "weeklyReportEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderHour" INTEGER NOT NULL DEFAULT 18,
    "parentPinHash" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'family',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parent_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "children" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "avatarGlyph" TEXT NOT NULL DEFAULT '🧒',
    "avatarTone" TEXT NOT NULL DEFAULT 'sky',
    "locale" "Locale" NOT NULL DEFAULT 'EN',
    "dailyGoalLessons" INTEGER NOT NULL DEFAULT 4,
    "favouriteSubjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "children_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "glyph" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject_translations" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "subject_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_translations" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "category_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "categoryId" TEXT,
    "ageCategory" "AgeCategory" NOT NULL,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'EASY',
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "durationMinutes" INTEGER NOT NULL DEFAULT 8,
    "xpReward" INTEGER NOT NULL DEFAULT 20,
    "starReward" INTEGER NOT NULL DEFAULT 5,
    "glyph" TEXT NOT NULL DEFAULT '📘',
    "tone" TEXT NOT NULL DEFAULT 'brand',
    "coverMediaId" TEXT,
    "videoMediaId" TEXT,
    "audioMediaId" TEXT,
    "completions" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_translations" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "lesson_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_blocks" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "LessonBlockType" NOT NULL,
    "glyph" TEXT,
    "mediaId" TEXT,
    "settings" JSONB,

    CONSTRAINT "lesson_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_block_translations" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "sayIt" TEXT,

    CONSTRAINT "lesson_block_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_questions" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,

    CONSTRAINT "lesson_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_question_translations" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "prompt" TEXT NOT NULL,

    CONSTRAINT "lesson_question_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_question_options" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "glyph" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "lesson_question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_question_option_translations" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "lesson_question_option_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_progress" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "percent" INTEGER NOT NULL DEFAULT 0,
    "starsEarned" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "GameType" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "ageCategory" "AgeCategory" NOT NULL,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'EASY',
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "glyph" TEXT NOT NULL DEFAULT '🎮',
    "tone" TEXT NOT NULL DEFAULT 'brand',
    "roundsPerSession" INTEGER NOT NULL DEFAULT 6,
    "boardConfig" JSONB,
    "plays" INTEGER NOT NULL DEFAULT 0,
    "completedPlays" INTEGER NOT NULL DEFAULT 0,
    "scoreSum" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_translations" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "game_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_questions" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "promptGlyph" TEXT,
    "promptTone" TEXT,
    "audioMediaId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "game_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_question_translations" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "prompt" TEXT NOT NULL,

    CONSTRAINT "game_question_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_question_options" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "glyph" TEXT NOT NULL,
    "tone" TEXT,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "game_question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_question_option_translations" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "game_question_option_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_sessions" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "seed" INTEGER NOT NULL,
    "questionIds" TEXT[],
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_attempts" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "sessionId" TEXT,
    "clientAttemptId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "correctAnswers" INTEGER NOT NULL,
    "wrongAnswers" INTEGER NOT NULL,
    "accuracy" INTEGER NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "starsAwarded" INTEGER NOT NULL DEFAULT 0,
    "xpAwarded" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_attempt_answers" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptionKey" TEXT,
    "correct" BOOLEAN NOT NULL,
    "timeMs" INTEGER,

    CONSTRAINT "game_attempt_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "lessonsCompleted" INTEGER NOT NULL DEFAULT 0,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "questionsAnswered" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "wrongAnswers" INTEGER NOT NULL DEFAULT 0,
    "learningSeconds" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDayKey" TEXT,
    "lastActivityAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject_stats" (
    "id" TEXT NOT NULL,
    "progressId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "totalAnswers" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "previousScore" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subject_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_stats" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "learningSeconds" INTEGER NOT NULL DEFAULT 0,
    "lessonsCompleted" INTEGER NOT NULL DEFAULT 0,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "questionsAnswered" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "starsEarned" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "glyph" TEXT NOT NULL DEFAULT '✨',
    "tone" TEXT NOT NULL DEFAULT 'brand',
    "xp" INTEGER,
    "stars" INTEGER,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "tier" "MedalTier" NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'learning',
    "glyph" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 50,
    "condition" JSONB NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievement_translations" (
    "id" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "achievement_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_achievements" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "unlockedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "child_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rewards" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "glyph" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "costStars" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_translations" (
    "id" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "reward_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_rewards" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "starsSpent" INTEGER NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "child_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "programme" TEXT NOT NULL,
    "titleKey" TEXT NOT NULL DEFAULT 'cert.title',
    "xp" INTEGER NOT NULL,
    "stars" INTEGER NOT NULL,
    "status" "CertificateStatus" NOT NULL DEFAULT 'PENDING',
    "mediaId" TEXT,
    "error" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboard_entries" (
    "id" TEXT NOT NULL,
    "period" "LeaderboardPeriod" NOT NULL,
    "bucket" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarGlyph" TEXT NOT NULL,
    "avatarTone" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "xp" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaderboard_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "actionLabel" TEXT NOT NULL DEFAULT 'Start lesson',
    "subjectId" TEXT,
    "lessonId" TEXT,
    "minutes" INTEGER NOT NULL DEFAULT 10,
    "confidence" INTEGER NOT NULL DEFAULT 70,
    "source" "RecommendationSource" NOT NULL DEFAULT 'RULE_BASED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "filename" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "durationSeconds" INTEGER,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "aiPrompt" TEXT,
    "usedIn" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_jobs" (
    "id" TEXT NOT NULL,
    "type" "AiJobType" NOT NULL,
    "status" "AiJobStatus" NOT NULL DEFAULT 'QUEUED',
    "prompt" TEXT NOT NULL,
    "style" TEXT,
    "ageCategory" "AgeCategory",
    "subjectId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'preview',
    "mediaId" TEXT,
    "error" TEXT,
    "metadata" JSONB,
    "requestedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ai_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_reviews" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "approved" BOOLEAN NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "glyph" TEXT NOT NULL DEFAULT '🔔',
    "tone" TEXT NOT NULL DEFAULT 'brand',
    "href" TEXT,
    "childId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "parent_profiles_userId_key" ON "parent_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_revokedAt_idx" ON "refresh_tokens"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "children_parentId_deletedAt_idx" ON "children"("parentId", "deletedAt");

-- CreateIndex
CREATE INDEX "children_deletedAt_idx" ON "children"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_slug_key" ON "subjects"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "subject_translations_subjectId_locale_key" ON "subject_translations"("subjectId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_subjectId_status_idx" ON "categories"("subjectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "category_translations_categoryId_locale_key" ON "category_translations"("categoryId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_slug_key" ON "lessons"("slug");

-- CreateIndex
CREATE INDEX "lessons_status_ageCategory_idx" ON "lessons"("status", "ageCategory");

-- CreateIndex
CREATE INDEX "lessons_subjectId_status_idx" ON "lessons"("subjectId", "status");

-- CreateIndex
CREATE INDEX "lessons_categoryId_idx" ON "lessons"("categoryId");

-- CreateIndex
CREATE INDEX "lessons_deletedAt_idx" ON "lessons"("deletedAt");

-- CreateIndex
CREATE INDEX "lesson_translations_locale_idx" ON "lesson_translations"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_translations_lessonId_locale_key" ON "lesson_translations"("lessonId", "locale");

-- CreateIndex
CREATE INDEX "lesson_blocks_lessonId_idx" ON "lesson_blocks"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_blocks_lessonId_order_key" ON "lesson_blocks"("lessonId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_block_translations_blockId_locale_key" ON "lesson_block_translations"("blockId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_questions_blockId_key" ON "lesson_questions"("blockId");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_question_translations_questionId_locale_key" ON "lesson_question_translations"("questionId", "locale");

-- CreateIndex
CREATE INDEX "lesson_question_options_questionId_idx" ON "lesson_question_options"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_question_option_translations_optionId_locale_key" ON "lesson_question_option_translations"("optionId", "locale");

-- CreateIndex
CREATE INDEX "lesson_progress_childId_completedAt_idx" ON "lesson_progress"("childId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_progress_childId_lessonId_key" ON "lesson_progress"("childId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "games_slug_key" ON "games"("slug");

-- CreateIndex
CREATE INDEX "games_status_ageCategory_idx" ON "games"("status", "ageCategory");

-- CreateIndex
CREATE INDEX "games_subjectId_status_idx" ON "games"("subjectId", "status");

-- CreateIndex
CREATE INDEX "games_type_idx" ON "games"("type");

-- CreateIndex
CREATE INDEX "games_deletedAt_idx" ON "games"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "game_translations_gameId_locale_key" ON "game_translations"("gameId", "locale");

-- CreateIndex
CREATE INDEX "game_questions_gameId_idx" ON "game_questions"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "game_questions_gameId_key_key" ON "game_questions"("gameId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "game_question_translations_questionId_locale_key" ON "game_question_translations"("questionId", "locale");

-- CreateIndex
CREATE INDEX "game_question_options_questionId_idx" ON "game_question_options"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "game_question_options_questionId_key_key" ON "game_question_options"("questionId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "game_question_option_translations_optionId_locale_key" ON "game_question_option_translations"("optionId", "locale");

-- CreateIndex
CREATE INDEX "game_sessions_childId_startedAt_idx" ON "game_sessions"("childId", "startedAt");

-- CreateIndex
CREATE INDEX "game_sessions_expiresAt_idx" ON "game_sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "game_attempts_sessionId_key" ON "game_attempts"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "game_attempts_clientAttemptId_key" ON "game_attempts"("clientAttemptId");

-- CreateIndex
CREATE INDEX "game_attempts_childId_completedAt_idx" ON "game_attempts"("childId", "completedAt");

-- CreateIndex
CREATE INDEX "game_attempts_gameId_completedAt_idx" ON "game_attempts"("gameId", "completedAt");

-- CreateIndex
CREATE INDEX "game_attempt_answers_attemptId_idx" ON "game_attempt_answers"("attemptId");

-- CreateIndex
CREATE INDEX "game_attempt_answers_questionId_correct_idx" ON "game_attempt_answers"("questionId", "correct");

-- CreateIndex
CREATE UNIQUE INDEX "progress_childId_key" ON "progress"("childId");

-- CreateIndex
CREATE INDEX "progress_xp_idx" ON "progress"("xp");

-- CreateIndex
CREATE INDEX "progress_stars_idx" ON "progress"("stars");

-- CreateIndex
CREATE UNIQUE INDEX "subject_stats_progressId_subjectId_key" ON "subject_stats"("progressId", "subjectId");

-- CreateIndex
CREATE INDEX "daily_stats_childId_date_idx" ON "daily_stats"("childId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_stats_childId_dayKey_key" ON "daily_stats"("childId", "dayKey");

-- CreateIndex
CREATE INDEX "activities_childId_createdAt_idx" ON "activities"("childId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_code_key" ON "achievements"("code");

-- CreateIndex
CREATE UNIQUE INDEX "achievement_translations_achievementId_locale_key" ON "achievement_translations"("achievementId", "locale");

-- CreateIndex
CREATE INDEX "child_achievements_childId_unlockedAt_idx" ON "child_achievements"("childId", "unlockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "child_achievements_childId_achievementId_key" ON "child_achievements"("childId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "rewards_code_key" ON "rewards"("code");

-- CreateIndex
CREATE UNIQUE INDEX "reward_translations_rewardId_locale_key" ON "reward_translations"("rewardId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "child_rewards_childId_rewardId_key" ON "child_rewards"("childId", "rewardId");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_serial_key" ON "certificates"("serial");

-- CreateIndex
CREATE INDEX "certificates_childId_issuedAt_idx" ON "certificates"("childId", "issuedAt");

-- CreateIndex
CREATE INDEX "leaderboard_entries_period_bucket_rank_idx" ON "leaderboard_entries"("period", "bucket", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_entries_period_bucket_childId_key" ON "leaderboard_entries"("period", "bucket", "childId");

-- CreateIndex
CREATE INDEX "recommendations_childId_expiresAt_idx" ON "recommendations"("childId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "media_storageKey_key" ON "media"("storageKey");

-- CreateIndex
CREATE INDEX "media_kind_status_idx" ON "media"("kind", "status");

-- CreateIndex
CREATE INDEX "media_createdAt_idx" ON "media"("createdAt");

-- CreateIndex
CREATE INDEX "media_deletedAt_idx" ON "media"("deletedAt");

-- CreateIndex
CREATE INDEX "ai_jobs_status_createdAt_idx" ON "ai_jobs"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ai_jobs_type_status_idx" ON "ai_jobs"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ai_reviews_jobId_key" ON "ai_reviews"("jobId");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_resource_resourceId_idx" ON "audit_logs"("resource", "resourceId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "parent_profiles" ADD CONSTRAINT "parent_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_favouriteSubjectId_fkey" FOREIGN KEY ("favouriteSubjectId") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_translations" ADD CONSTRAINT "subject_translations_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_videoMediaId_fkey" FOREIGN KEY ("videoMediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_audioMediaId_fkey" FOREIGN KEY ("audioMediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_translations" ADD CONSTRAINT "lesson_translations_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_blocks" ADD CONSTRAINT "lesson_blocks_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_blocks" ADD CONSTRAINT "lesson_blocks_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_block_translations" ADD CONSTRAINT "lesson_block_translations_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "lesson_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_questions" ADD CONSTRAINT "lesson_questions_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "lesson_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_question_translations" ADD CONSTRAINT "lesson_question_translations_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "lesson_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_question_options" ADD CONSTRAINT "lesson_question_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "lesson_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_question_option_translations" ADD CONSTRAINT "lesson_question_option_translations_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "lesson_question_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_translations" ADD CONSTRAINT "game_translations_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_questions" ADD CONSTRAINT "game_questions_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_questions" ADD CONSTRAINT "game_questions_audioMediaId_fkey" FOREIGN KEY ("audioMediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_question_translations" ADD CONSTRAINT "game_question_translations_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "game_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_question_options" ADD CONSTRAINT "game_question_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "game_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_question_option_translations" ADD CONSTRAINT "game_question_option_translations_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "game_question_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_attempts" ADD CONSTRAINT "game_attempts_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_attempts" ADD CONSTRAINT "game_attempts_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_attempts" ADD CONSTRAINT "game_attempts_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "game_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_attempt_answers" ADD CONSTRAINT "game_attempt_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "game_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_attempt_answers" ADD CONSTRAINT "game_attempt_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "game_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress" ADD CONSTRAINT "progress_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_stats" ADD CONSTRAINT "subject_stats_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "progress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_stats" ADD CONSTRAINT "subject_stats_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_stats" ADD CONSTRAINT "daily_stats_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_translations" ADD CONSTRAINT "achievement_translations_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_achievements" ADD CONSTRAINT "child_achievements_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_achievements" ADD CONSTRAINT "child_achievements_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_translations" ADD CONSTRAINT "reward_translations_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "rewards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_rewards" ADD CONSTRAINT "child_rewards_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_rewards" ADD CONSTRAINT "child_rewards_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "rewards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_entries" ADD CONSTRAINT "leaderboard_entries_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_reviews" ADD CONSTRAINT "ai_reviews_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ai_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_reviews" ADD CONSTRAINT "ai_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
