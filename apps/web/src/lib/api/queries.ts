import type {
  AchievementDto,
  AuthUser,
  LessonCompletionResultDto,
  ActivityDto,
  AdminAnalyticsDto,
  AdminMetricsDto,
  AiJobDto,
  AiProviderStatusDto,
  AuditLogDto,
  CertificateDto,
  ChildDto,
  ChildProgressDto,
  FeatureFlagsDto,
  GameAttemptResultDto,
  GameDto,
  GameSessionDto,
  LeaderboardDto,
  LessonDto,
  MediaDto,
  NotificationDto,
  RecommendationDto,
  RewardDto,
  StatisticsSummaryDto,
  SubjectDto,
} from "@kidslearn/types";
import { api } from "./client";

/**
 * Query keys.
 *
 * Every key is derived here so an invalidation can never miss a variant — the
 * cache and the code that clears it read from the same source.
 */
export const queryKeys = {
  session: ["session"] as const,
  featureFlags: ["feature-flags"] as const,
  subjects: ["subjects"] as const,
  children: ["children"] as const,
  child: (id: string) => ["children", id] as const,
  progress: (childId: string) => ["children", childId, "progress"] as const,
  activity: (childId: string) => ["children", childId, "activity"] as const,
  achievements: (childId: string) => ["children", childId, "achievements"] as const,
  rewards: (childId: string) => ["children", childId, "rewards"] as const,
  certificates: (childId: string) => ["children", childId, "certificates"] as const,
  certificate: (id: string) => ["certificates", id] as const,
  statistics: (childId: string, preset: string) => ["children", childId, "statistics", preset] as const,
  recommendation: (childId: string) => ["children", childId, "recommendation"] as const,
  lessons: (params: Record<string, unknown>) => ["lessons", params] as const,
  lesson: (idOrSlug: string, childId?: string) => ["lessons", idOrSlug, childId ?? null] as const,
  games: (params: Record<string, unknown>) => ["games", params] as const,
  game: (idOrSlug: string) => ["games", idOrSlug] as const,
  leaderboard: (period: string, childId?: string) => ["leaderboard", period, childId ?? null] as const,
  notifications: (params: Record<string, unknown>) => ["notifications", params] as const,
  pushStatus: ["notifications", "push-status"] as const,
  parentSettings: ["auth", "parent-settings"] as const,
  adminMetrics: ["admin", "metrics"] as const,
  adminAnalytics: ["admin", "analytics"] as const,
  adminUsers: (params: Record<string, unknown>) => ["admin", "users", params] as const,
  adminAchievements: ["admin", "achievements"] as const,
  adminRewards: ["admin", "rewards"] as const,
  adminCertificates: (params: Record<string, unknown>) => ["admin", "certificates", params] as const,
  auditLog: (params: Record<string, unknown>) => ["admin", "audit-log", params] as const,
  categories: (params: Record<string, unknown>) => ["categories", params] as const,
  media: (params: Record<string, unknown>) => ["media", params] as const,
  aiStatus: ["ai", "status"] as const,
  aiJobs: (params: Record<string, unknown>) => ["ai", "jobs", params] as const,
};

/* --- Platform ------------------------------------------------------------- */

export const fetchFeatureFlags = () => api.get<FeatureFlagsDto>("/feature-flags");
export const updateFeatureFlag = (key: string, enabled: boolean) =>
  api.patch<FeatureFlagsDto>(`/feature-flags/${key}`, { enabled });
export const fetchSubjects = (locale?: string) => api.get<SubjectDto[]>("/subjects", { query: { locale } });

/* --- Children ------------------------------------------------------------- */

export const fetchChildren = () => api.get<ChildDto[]>("/children");
export const fetchChild = (id: string) => api.get<ChildDto>(`/children/${id}`);
export const createChild = (body: unknown) => api.post<ChildDto>("/children", body);
export const updateChild = (id: string, body: unknown) => api.patch<ChildDto>(`/children/${id}`, body);
export const deleteChild = (id: string) => api.delete<void>(`/children/${id}`);

/* --- Progress ------------------------------------------------------------- */

export const fetchProgress = (childId: string) => api.get<ChildProgressDto>(`/children/${childId}/progress`);
export const fetchActivity = (childId: string, limit = 10) =>
  api.getPage<ActivityDto>(`/children/${childId}/activity`, { query: { limit } });
export const fetchAchievements = (childId: string) =>
  api.get<AchievementDto[]>(`/children/${childId}/achievements`);
export const fetchRewards = (childId: string) => api.get<RewardDto[]>(`/children/${childId}/rewards`);
export const claimReward = (childId: string, rewardId: string) =>
  api.post<RewardDto[]>(`/children/${childId}/rewards/claim`, { rewardId });
export const fetchCertificate = (id: string) => api.get<CertificateDto>(`/certificates/${id}`);
export const rerenderCertificate = (id: string) => api.post<CertificateDto>(`/certificates/${id}/render`);
export const fetchCertificates = (childId: string) =>
  api.get<CertificateDto[]>(`/children/${childId}/certificates`);

/* --- Analytics ------------------------------------------------------------ */

export const fetchStatistics = (childId: string, preset: string) =>
  api.get<StatisticsSummaryDto>(`/children/${childId}/statistics`, { query: { preset } });
export const fetchRecommendation = (childId: string) =>
  api.get<RecommendationDto | null>(`/children/${childId}/recommendation`);
export const fetchLeaderboard = (period: string, childId?: string) =>
  api.get<LeaderboardDto>("/leaderboard", { query: { period, childId } });

/* --- Content -------------------------------------------------------------- */

export interface LessonListParams {
  childId?: string;
  locale?: string;
  subjectId?: string;
  ageCategory?: string;
  difficulty?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export const fetchLessons = (params: LessonListParams) =>
  api.getPage<LessonDto>("/lessons", { query: params as Record<string, string | number | undefined> });
export const fetchLesson = (idOrSlug: string, childId?: string, locale?: string) =>
  api.get<LessonDto>(`/lessons/${idOrSlug}`, { query: { childId, locale } });
export const saveLessonProgress = (lessonId: string, childId: string, percent: number) =>
  api.post<void>(`/lessons/${lessonId}/progress`, { childId, percent });
export const changeLessonStatus = (id: string, status: string) =>
  api.patch<LessonDto>(`/lessons/${id}/status`, { status });
export const upsertLesson = (body: unknown, id?: string) =>
  id ? api.patch<LessonDto>(`/lessons/${id}`, body) : api.post<LessonDto>("/lessons", body);
export const deleteLesson = (id: string) => api.delete<void>(`/lessons/${id}`);
export const fetchCategories = (params: Record<string, string | number | undefined>) =>
  api.getPage<{
    id: string;
    slug: string;
    name: string;
    subjectId: string;
    status: string;
    itemCount: number;
    updatedAt: string;
  }>("/categories", { query: params });
export const gradeLessonAnswer = (lessonId: string, childId: string, questionId: string, selectedOptionId: string) =>
  api.post<{ correct: boolean; correctOptionId: string }>(`/lessons/${lessonId}/answers`, {
    childId,
    questionId,
    selectedOptionId,
  });
export const completeLesson = (lessonId: string, body: unknown) =>
  api.post<LessonCompletionResultDto>(`/lessons/${lessonId}/complete`, body);

/* --- Games ---------------------------------------------------------------- */

export const fetchGames = (params: LessonListParams & { type?: string }) =>
  api.getPage<GameDto>("/games", { query: params as Record<string, string | number | undefined> });
export const fetchGame = (idOrSlug: string) => api.get<GameDto>(`/games/${idOrSlug}`);
export const startGameSession = (idOrSlug: string, childId: string, seed?: number) =>
  api.post<GameSessionDto>(`/games/${idOrSlug}/sessions`, { childId, seed });
export const submitGameAttempt = (body: unknown) => api.post<GameAttemptResultDto>("/games/attempts", body);
/** Grades one pick so the child gets feedback without the key ever shipping. */
export const gradeGameAnswer = (sessionId: string, questionId: string, selectedOptionId: string) =>
  api.post<{ correct: boolean; correctOptionId: string }>(`/games/sessions/${sessionId}/answers`, {
    questionId,
    selectedOptionId,
  });

/* --- Notifications -------------------------------------------------------- */

export const fetchNotifications = (params: { page?: number; limit?: number; read?: boolean }) =>
  api.getPage<NotificationDto>("/notifications", { query: params as Record<string, string | number | undefined> });
export const markNotificationRead = (id: string) => api.patch<void>(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.patch<{ marked: number }>("/notifications/read-all");
export const deleteNotification = (id: string) => api.delete<void>(`/notifications/${id}`);
export const fetchPushStatus = () =>
  api.get<{ configured: boolean; publicKey: string | null; subscribed: boolean }>("/notifications/push/status");

/* --- Admin ---------------------------------------------------------------- */

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  childrenCount: number;
  avatarGlyph: string;
  avatarTone: string;
  createdAt: string;
  lastSeenAt: string | null;
}

export const fetchAdminMetrics = () => api.get<AdminMetricsDto>("/admin/metrics");
export const fetchAdminAnalytics = () => api.get<AdminAnalyticsDto>("/admin/analytics");
export const fetchAdminUsers = (params: Record<string, string | number | undefined>) =>
  api.getPage<AdminUserRow>("/admin/users", { query: params });
export const updateAdminUser = (id: string, body: unknown) => api.patch<AdminUserRow>(`/admin/users/${id}`, body);
export const fetchAuditLog = (params: Record<string, string | number | undefined>) =>
  api.getPage<AuditLogDto>("/admin/audit-log", { query: params });
export const fetchMedia = (params: Record<string, string | number | undefined>) =>
  api.getPage<MediaDto>("/media", { query: params });

/* --- AI ------------------------------------------------------------------- */

export const fetchAiStatus = () => api.get<AiProviderStatusDto>("/ai/status");

/* --- Profile & settings ---------------------------------------------------- */

export interface ParentSettingsDto {
  timezone: string;
  reminderEnabled: boolean;
  reminderHour: number;
  weeklyReportEnabled: boolean;
  hasPin: boolean;
}

export const updateProfile = (body: unknown) => api.patch<AuthUser>("/auth/profile", body);
export const changePassword = (body: unknown) => api.post<void>("/auth/change-password", body);
export const fetchParentSettings = () => api.get<ParentSettingsDto>("/auth/parent-settings");
export const updateParentSettings = (body: unknown) => api.patch<ParentSettingsDto>("/auth/parent-settings", body);
export const setParentPin = (pin: string) => api.post<void>("/auth/parent-pin", { pin });
export const verifyParentPin = (pin: string) =>
  api.post<{ configured: boolean; valid: boolean }>("/auth/parent-pin/verify", { pin });
export const subscribePush = (subscription: unknown) => api.post<void>("/notifications/push/subscribe", subscription);
export const unsubscribePush = (endpoint: string) => api.post<void>("/notifications/push/unsubscribe", { endpoint });

/* --- Admin definitions ------------------------------------------------------ */

export interface AdminAchievementRow {
  id: string;
  code: string;
  tier: string;
  category: string;
  glyph: string;
  tone: string;
  xpReward: number;
  active: boolean;
  title: string;
  description: string;
  unlockedCount: number;
  unlockRate: number;
}

export interface AdminRewardRow {
  id: string;
  code: string;
  glyph: string;
  tone: string;
  costStars: number;
  active: boolean;
  title: string;
  description: string;
  claimCount: number;
}

export interface AdminCertificateRow {
  id: string;
  childId: string;
  childName: string;
  programme: string;
  serial: string;
  xp: number;
  stars: number;
  status: string;
  issuedAt: string;
}

export const fetchAdminAchievements = () => api.get<AdminAchievementRow[]>("/admin/achievements");
export const fetchAdminRewards = () => api.get<AdminRewardRow[]>("/admin/rewards");
export const fetchAdminCertificates = (params: Record<string, string | number | undefined>) =>
  api.getPage<AdminCertificateRow>("/admin/certificates", { query: params });
export const broadcastNotification = (body: { title: string; body: string; href?: string }) =>
  api.post<{ reach: number }>("/admin/notifications/broadcast", body);
export const deleteMedia = (id: string) => api.delete<void>(`/media/${id}`);
export const uploadMedia = (file: File, kind: string | undefined, onProgress?: (percent: number) => void) => {
  const form = new FormData();
  form.append("file", file);
  return api.upload<MediaDto>(`/media/upload${kind ? `?kind=${kind}` : ""}`, form, onProgress);
};
export const upsertSubject = (body: unknown) => api.post("/subjects", body);
export const upsertCategory = (body: unknown) => api.post("/categories", body);
export const generateAiImage = (body: unknown) => api.post<AiJobDto>("/ai/images", body);
export const fetchAiJobs = (params: Record<string, string | number | undefined>) =>
  api.getPage<AiJobDto>("/ai/jobs", { query: params });
export const reviewAiJob = (id: string, approve: boolean, note?: string) =>
  api.post<AiJobDto>(`/ai/jobs/${id}/review`, { approve, note });
