"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Pencil } from "lucide-react";
import { cn, formatDate, formatDuration, formatRelativeTime } from "@/lib/utils";
import { toneStyles, type Tone } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import type { ChildDto } from "@kidslearn/types";
import {
  fetchAchievements,
  fetchActivity,
  fetchCertificates,
  fetchLeaderboard,
  fetchRecommendation,
  fetchStatistics,
  queryKeys,
} from "@/lib/api/queries";
import { Card, CardBody, CardHeader, ChartCard } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { ProgressRing, XpBar } from "@/components/ui/progress";
import { AreaChart } from "@/components/charts/area-chart";
import { HeatGrid } from "@/components/charts/heat-grid";
import { EmptyState, SkeletonCard } from "@/components/ui/states";
import { AchievementCard } from "@/features/rewards/achievement-card";
import { LeaderboardList } from "@/features/rewards/leaderboard-list";
import { VoiceAssistantCard } from "@/features/voice/voice-assistant-card";
import { ActivityFeed, AiRecommendationCard, SubjectStrengthCard } from "./dashboard-widgets";

type TabId = "overview" | "progress" | "achievements" | "activity" | "statistics";

/** Everything on this page is fetched per child; nothing is derived locally. */
export function ChildProfileView({ child }: { child: ChildDto }) {
  const t = useT();
  const { intlLocale } = useI18n();
  const [tab, setTab] = useState<TabId>("overview");

  const statistics = useQuery({
    queryKey: queryKeys.statistics(child.id, "month"),
    queryFn: () => fetchStatistics(child.id, "month"),
  });
  const achievements = useQuery({
    queryKey: queryKeys.achievements(child.id),
    queryFn: () => fetchAchievements(child.id),
  });
  const activity = useQuery({
    queryKey: queryKeys.activity(child.id),
    queryFn: () => fetchActivity(child.id, 25),
  });
  const recommendation = useQuery({
    queryKey: queryKeys.recommendation(child.id),
    queryFn: () => fetchRecommendation(child.id),
  });
  const certificates = useQuery({
    queryKey: queryKeys.certificates(child.id),
    queryFn: () => fetchCertificates(child.id),
  });
  const leaderboard = useQuery({
    queryKey: queryKeys.leaderboard("WEEKLY", child.id),
    queryFn: () => fetchLeaderboard("WEEKLY", child.id),
  });

  const progress = child.progress;
  const unlocked = (achievements.data ?? []).filter((achievement) => achievement.unlockedAt);
  const tone = child.avatarTone as Tone;
  const programmePercent = Math.min(100, Math.round(((progress?.lessonsCompleted ?? 0) / 40) * 100));

  return (
    <div className="mx-auto w-full max-w-[95rem] space-y-5">
      <Link href="/children" className="t-label inline-flex items-center gap-1.5 text-content-secondary hover:text-content">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("parent.childrenTitle")}
      </Link>

      {/* ---- Hero -------------------------------------------------------- */}
      <Card className="overflow-hidden">
        <div className={cn("relative h-32 sm:h-40", toneStyles[tone]?.gradient ?? toneStyles.brand.gradient)}>
          <div
            className="absolute inset-0 opacity-35"
            aria-hidden
            style={{
              backgroundImage:
                "radial-gradient(circle at 15% 20%, rgba(255,255,255,0.6), transparent 45%), radial-gradient(circle at 85% 80%, rgba(255,255,255,0.45), transparent 50%)",
            }}
          />
        </div>

        <CardBody className="pt-0">
          <div className="flex flex-wrap items-end gap-5">
            <div className="-mt-12 sm:-mt-14">
              <Avatar spec={{ glyph: child.avatarGlyph, tone }} size="2xl" className="ring-4 ring-surface shadow-card" />
            </div>

            <div className="min-w-0 flex-1 pb-1">
              <h1 className="t-h1 text-content">{child.name}</h1>
              <p className="t-body-sm mt-0.5 text-content-secondary">
                {child.age} years old · Member since {formatDate(child.createdAt, intlLocale)}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Badge tone="brand">Level {progress?.level ?? 1}</Badge>
                <Badge tone="coral">🔥 {progress?.currentStreak ?? 0}-day streak</Badge>
                <Badge tone="mint">{progress?.accuracy ?? 0}% accuracy</Badge>
                <Badge tone="sky">Ages {child.ageCategory.replace("AGE_", "").replace("_", "–")}</Badge>
              </div>
            </div>

            <div className="flex gap-2 pb-1">
              <ButtonLink href={`/kids?child=${child.id}`} variant="primary" size="md">
                {t("nav.kidMode")}
              </ButtonLink>
              <ButtonLink href="/settings" variant="secondary" size="md" leadingIcon={<Pencil className="h-4 w-4" />}>
                {t("common.edit")}
              </ButtonLink>
            </div>
          </div>

          {progress ? (
            <div className="mt-6">
              <XpBar xp={progress.xpIntoLevel} xpToNext={progress.xpForNextLevel} level={progress.level} />
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Tabs
        ariaLabel="Child profile sections"
        value={tab}
        onChange={setTab}
        items={[
          { id: "overview", label: "Overview" },
          { id: "progress", label: t("nav.progress") },
          { id: "achievements", label: t("nav.achievements"), count: unlocked.length },
          { id: "activity", label: "Activity" },
          { id: "statistics", label: t("nav.statistics") },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          {tab === "overview" ? (
            <>
              <Card>
                <CardHeader title="Learning progress" subtitle="Against the Early Learning Program" />
                <CardBody className="flex flex-wrap items-center gap-6">
                  <ProgressRing
                    value={programmePercent}
                    size={140}
                    thickness={14}
                    tone={tone}
                    label={`${programmePercent}% of the programme complete`}
                  >
                    <div>
                      <p className="t-h1 font-extrabold text-content tabular-nums">{programmePercent}%</p>
                      <p className="t-caption font-semibold text-content-secondary">
                        {programmePercent >= 75 ? "Great job!" : "Keep going"}
                      </p>
                    </div>
                  </ProgressRing>

                  <dl className="min-w-52 flex-1 space-y-3">
                    {[
                      { glyph: "📗", label: t("parent.lessonsCompleted"), value: progress?.lessonsCompleted ?? 0 },
                      { glyph: "🎮", label: "Games played", value: progress?.gamesPlayed ?? 0 },
                      { glyph: "⭐", label: t("parent.starsEarned"), value: progress?.stars ?? 0 },
                      {
                        glyph: "⏱️",
                        label: "Time spent",
                        value: formatDuration(Math.round((progress?.learningSeconds ?? 0) / 60)),
                      },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between gap-4 border-b border-border pb-2.5 last:border-0 last:pb-0"
                      >
                        <dt className="t-body-sm flex items-center gap-2 text-content-secondary">
                          <span aria-hidden>{row.glyph}</span>
                          {row.label}
                        </dt>
                        <dd className="t-h4 text-content tabular-nums">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </CardBody>
              </Card>

              <Card>
                <CardHeader
                  title="Recent achievements"
                  action={
                    <Link href="/achievements" className="t-label text-primary hover:underline">
                      {t("common.viewAll")}
                    </Link>
                  }
                />
                <CardBody>
                  {achievements.isLoading ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="shimmer h-32 rounded-xl" />
                      ))}
                    </div>
                  ) : unlocked.length === 0 ? (
                    <EmptyState compact glyph="🏅" title="No medals yet" body="The first unlocks after one lesson." />
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {unlocked.slice(0, 4).map((achievement) => (
                        <AchievementCard key={achievement.id} achievement={achievement} compact />
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            </>
          ) : null}

          {tab === "progress" ? (
            <>
              <ChartCard title={t("parent.weeklyProgress")} subtitle="Minutes learned per day">
                <AreaChart
                  points={statistics.data?.series.learningMinutes ?? []}
                  tone={tone}
                  valueSuffix=" min"
                  ariaLabel="Learning minutes"
                />
              </ChartCard>
              <SubjectStrengthCard strengths={statistics.data?.subjectStrength ?? []} loading={statistics.isLoading} />
              <Card>
                <CardHeader title="Learning consistency" subtitle="Last 5 weeks" />
                <CardBody>
                  <HeatGrid values={(statistics.data?.consistency ?? []).map((day) => day.level)} />
                </CardBody>
              </Card>
            </>
          ) : null}

          {tab === "achievements" ? (
            <Card>
              <CardHeader
                title={t("nav.achievements")}
                subtitle={`${unlocked.length} of ${achievements.data?.length ?? 0} unlocked`}
              />
              <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(achievements.data ?? []).map((achievement) => (
                  <AchievementCard key={achievement.id} achievement={achievement} />
                ))}
              </CardBody>
            </Card>
          ) : null}

          {tab === "activity" ? (
            <ActivityFeed
              events={activity.data?.items ?? []}
              title="All activity"
              emptyLabel="No activity recorded yet."
              loading={activity.isLoading}
            />
          ) : null}

          {tab === "statistics" ? (
            <>
              <ChartCard title="Accuracy trend" subtitle="Correct answers per day">
                <AreaChart
                  points={statistics.data?.series.accuracy ?? []}
                  tone="mint"
                  valueSuffix="%"
                  ariaLabel="Accuracy trend"
                />
              </ChartCard>
              <ChartCard title="XP earned" subtitle="Per day">
                <AreaChart points={statistics.data?.series.xp ?? []} tone="brand" valueSuffix=" XP" ariaLabel="XP earned" />
              </ChartCard>
            </>
          ) : null}
        </div>

        {/* ---- Right rail ------------------------------------------------ */}
        <div className="space-y-5">
          <AiRecommendationCard
            recommendation={recommendation.data ?? null}
            childName={child.name}
            compact
            loading={recommendation.isLoading}
          />

          <Card>
            <CardHeader
              title={t("nav.leaderboard")}
              subtitle={t("common.thisWeek")}
              action={
                <Link href="/leaderboard" className="t-label text-primary hover:underline">
                  {t("common.viewAll")}
                </Link>
              }
            />
            <CardBody>
              {leaderboard.isLoading ? (
                <SkeletonCard />
              ) : (
                <LeaderboardList entries={(leaderboard.data?.entries ?? []).slice(0, 5)} compact />
              )}
            </CardBody>
          </Card>

          <VoiceAssistantCard />

          <Card>
            <CardHeader
              title={t("nav.certificates")}
              action={
                <Link href="/certificates" className="t-label text-primary hover:underline">
                  {t("common.viewAll")}
                </Link>
              }
            />
            <CardBody className="space-y-2.5">
              {certificates.isLoading ? (
                <div className="shimmer h-16 rounded-lg" />
              ) : (certificates.data ?? []).length === 0 ? (
                <p className="t-body-sm py-4 text-center text-content-secondary">
                  No certificates yet — they arrive at each programme milestone.
                </p>
              ) : (
                (certificates.data ?? []).map((certificate) => (
                  <Link
                    key={certificate.id}
                    href={`/certificates/${certificate.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-surface-muted"
                  >
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-sun-soft text-xl dark:bg-sun-core/15"
                      aria-hidden
                    >
                      📜
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="t-body-sm block truncate font-semibold text-content">{certificate.title}</span>
                      <span className="t-caption block text-content-secondary">
                        {formatRelativeTime(certificate.issuedAt, new Date(), intlLocale)}
                      </span>
                    </span>
                    <Download className="h-4 w-4 shrink-0 text-content-tertiary" aria-hidden />
                  </Link>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
