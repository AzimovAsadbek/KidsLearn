"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { toneStyles, type Tone } from "@/lib/tone";
import { useT } from "@/i18n/provider";
import { useSession } from "@/components/providers/session-provider";
import { useChildContext } from "@/components/providers/child-provider";
import { fetchAchievements, fetchActivity, fetchRecommendation, fetchStatistics, queryKeys } from "@/lib/api/queries";
import { Card, CardBody, CardHeader, ChartCard } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { AreaChart } from "@/components/charts/area-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { ProgressRing } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, SkeletonCard, SkeletonChart, SkeletonStatGrid } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import {
  ActivityFeed,
  AiRecommendationCard,
  ParentGreeting,
  ParentStatRow,
  SubjectStrengthCard,
} from "./dashboard-widgets";
import { FamilyOverview } from "./child-switcher";

type Metric = "minutes" | "lessons";

/**
 * The parent dashboard.
 *
 * Every figure comes from the API — there is no local fallback, so a family
 * with no children sees a genuine empty state rather than invented numbers.
 */
export function ParentDashboardView() {
  const t = useT();
  const { user } = useSession();
  const { selectedChild, loading: childrenLoading, children } = useChildContext();
  const [metric, setMetric] = useState<Metric>("minutes");

  const childId = selectedChild?.id;
  const enabled = Boolean(childId);

  const statistics = useQuery({
    queryKey: queryKeys.statistics(childId ?? "none", "week"),
    queryFn: () => fetchStatistics(childId as string, "week"),
    enabled,
  });
  const activity = useQuery({
    queryKey: queryKeys.activity(childId ?? "none"),
    queryFn: () => fetchActivity(childId as string, 8),
    enabled,
  });
  const recommendation = useQuery({
    queryKey: queryKeys.recommendation(childId ?? "none"),
    queryFn: () => fetchRecommendation(childId as string),
    enabled,
  });
  const achievements = useQuery({
    queryKey: queryKeys.achievements(childId ?? "none"),
    queryFn: () => fetchAchievements(childId as string),
    enabled,
  });

  if (childrenLoading) {
    return (
      <div className="mx-auto w-full max-w-[100rem] space-y-6" aria-busy="true">
        <SkeletonStatGrid />
        <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr_1.1fr]">
          <SkeletonChart />
          <SkeletonCard className="h-72" />
          <SkeletonCard className="h-72" />
        </div>
      </div>
    );
  }

  if (children.length === 0 || !selectedChild) {
    return (
      <div className="mx-auto w-full max-w-3xl py-10">
        <EmptyState
          glyph="👶"
          title="Add your first child"
          body="KidsLearn tailors every lesson to a child's age, so the dashboard fills in as soon as there's someone to follow."
          action={<ButtonLink href="/children?add=1">{t("parent.addChild")}</ButtonLink>}
        />
      </div>
    );
  }

  const progress = selectedChild.progress;
  const goalDone = progress?.todayLessons ?? 0;
  const goalPercent = Math.min(100, Math.round((goalDone / Math.max(1, selectedChild.dailyGoalLessons)) * 100));
  const unlocked = (achievements.data ?? []).filter((achievement) => achievement.unlockedAt);

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <ParentGreeting name={user?.name.split(" ")[0] ?? "there"} hour={new Date().getHours()} />
        <FamilyOverview />
      </div>

      {progress ? <ParentStatRow progress={progress} childName={selectedChild.name} /> : <SkeletonStatGrid />}

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr_1.1fr]">
        <ChartCard
          title={t("parent.weeklyProgress")}
          subtitle={`${selectedChild.name} · ${t("common.thisWeek")}`}
          action={
            <Tabs
              variant="segmented"
              ariaLabel="Chart metric"
              value={metric}
              onChange={setMetric}
              items={[
                { id: "minutes", label: t("common.minutes") },
                { id: "lessons", label: t("nav.lessons") },
              ]}
            />
          }
        >
          {statistics.isLoading ? (
            <div className="shimmer h-56 rounded-lg" />
          ) : statistics.isError ? (
            <p className="t-body-sm py-10 text-center text-content-secondary">{t("state.errorBody")}</p>
          ) : metric === "minutes" ? (
            <AreaChart
              points={statistics.data?.series.learningMinutes ?? []}
              tone="brand"
              valueSuffix=" min"
              ariaLabel={`${selectedChild.name} weekly learning minutes`}
              summaryLabel={`${Math.round((statistics.data?.learningSeconds ?? 0) / 60)} minutes this week`}
            />
          ) : (
            <BarChart
              points={statistics.data?.series.lessons ?? []}
              tone="mint"
              ariaLabel={`${selectedChild.name} weekly lessons completed`}
            />
          )}
        </ChartCard>

        <SubjectStrengthCard strengths={statistics.data?.subjectStrength ?? []} loading={statistics.isLoading} />

        <AiRecommendationCard
          recommendation={recommendation.data ?? null}
          childName={selectedChild.name}
          loading={recommendation.isLoading}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <ActivityFeed
          events={activity.data?.items ?? []}
          title={t("parent.recentActivity")}
          emptyLabel="Lessons and games appear here as they happen."
          limit={6}
          href="/progress"
          loading={activity.isLoading}
        />

        <div className="space-y-5">
          <Card>
            <CardHeader title={t("parent.todaysGoal")} subtitle={selectedChild.name} />
            <CardBody className="flex items-center gap-5">
              <ProgressRing
                value={goalPercent}
                size={110}
                tone={goalPercent >= 100 ? "mint" : "brand"}
                label={`${goalPercent}% of today's goal`}
              >
                <div>
                  <p className="t-h2 font-extrabold text-content tabular-nums">{goalDone}</p>
                  <p className="t-caption text-content-secondary">/ {selectedChild.dailyGoalLessons}</p>
                </div>
              </ProgressRing>
              <div className="min-w-0 flex-1">
                <p className="t-body-sm font-semibold text-content">
                  {t("parent.goalProgress", { done: goalDone, total: selectedChild.dailyGoalLessons })}
                </p>
                <p className="t-caption mt-1 text-content-secondary">
                  {goalPercent >= 100
                    ? "Goal reached — everything else today is a bonus."
                    : `${selectedChild.dailyGoalLessons - goalDone} more to go.`}
                </p>
                <Link
                  href={`/kids?child=${selectedChild.id}`}
                  className="t-label mt-3 inline-flex rounded-sm bg-primary-soft px-3 py-1.5 text-primary hover:bg-primary-soft-strong"
                >
                  {t("nav.kidMode")} →
                </Link>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={t("rewards.medals")}
              action={
                <Link href="/achievements" className="t-label text-primary hover:underline">
                  {t("common.viewAll")}
                </Link>
              }
            />
            <CardBody>
              {achievements.isLoading ? (
                <div className="grid grid-cols-4 gap-3">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="shimmer aspect-square rounded-lg" />
                  ))}
                </div>
              ) : unlocked.length === 0 ? (
                <p className="t-body-sm py-4 text-center text-content-secondary">
                  The first medal unlocks after one completed lesson.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {unlocked.slice(0, 4).map((achievement) => (
                    <Link
                      key={achievement.id}
                      href="/achievements"
                      className="tactile flex flex-col items-center gap-2 rounded-lg border border-border p-3 text-center"
                    >
                      <span
                        className={cn(
                          "grid h-11 w-11 place-items-center rounded-full text-2xl",
                          toneStyles[achievement.tone as Tone]?.soft ?? toneStyles.brand.soft,
                        )}
                        aria-hidden
                      >
                        {achievement.glyph}
                      </span>
                      <span className="t-caption line-clamp-2 font-semibold text-content">{achievement.title}</span>
                    </Link>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex items-center gap-4 pt-5">
              <Avatar spec={{ glyph: selectedChild.avatarGlyph, tone: selectedChild.avatarTone as Tone }} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="t-h4 truncate text-content">{selectedChild.name}</p>
                <p className="t-caption text-content-secondary">
                  {selectedChild.age} years · Level {progress?.level ?? 1} · {progress?.accuracy ?? 0}% accuracy
                </p>
              </div>
              <Link
                href={`/children/${selectedChild.id}`}
                className="t-label shrink-0 rounded-sm border border-border px-3 py-2 text-content hover:bg-surface-muted"
              >
                {t("parent.viewProfile")}
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
