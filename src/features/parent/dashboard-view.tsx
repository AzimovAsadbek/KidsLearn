"use client";

import { useState } from "react";
import Link from "next/link";
import { cn, calculateAge } from "@/lib/utils";
import { toneStyles } from "@/lib/tone";
import { useT } from "@/i18n/provider";
import { useAppStore, useGains } from "@/store/app-store";
import { getChild, NOW } from "@/data/children";
import { activityFor } from "@/data/notifications";
import { recommendationFor, subjectStrength, weeklyLessons, weeklyMinutes } from "@/data/analytics";
import { unlockedAchievements } from "@/data/rewards";
import { Card, CardBody, CardHeader, ChartCard } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { AreaChart } from "@/components/charts/area-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { ProgressRing } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import {
  ActivityFeed,
  AiRecommendationCard,
  ParentGreeting,
  ParentStatRow,
  SubjectStrengthCard,
} from "./dashboard-widgets";
import { FamilyOverview } from "./child-switcher";

type Range = "minutes" | "lessons";

export function ParentDashboardView() {
  const t = useT();
  const selectedId = useAppStore((s) => s.selectedChildId);
  const child = getChild(selectedId);
  const gains = useGains(child.id);
  const [range, setRange] = useState<Range>("minutes");

  const goalPercent = Math.round(
    ((child.dailyGoalCompleted + gains.lessonsCompleted) / child.dailyGoalLessons) * 100,
  );

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        {/* UTC, not local hours: the greeting must not depend on the renderer's timezone. */}
        <ParentGreeting name="Asadbek" hour={NOW.getUTCHours()} />
        <FamilyOverview />
      </div>

      <ParentStatRow child={child} gains={gains} />

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr_1.1fr]">
        <ChartCard
          title={t("parent.weeklyProgress")}
          subtitle={`${child.name} · ${t("common.thisWeek")}`}
          action={
            <Tabs
              variant="segmented"
              ariaLabel="Chart metric"
              value={range}
              onChange={setRange}
              items={[
                { id: "minutes", label: t("common.minutes") },
                { id: "lessons", label: t("nav.lessons") },
              ]}
            />
          }
        >
          {range === "minutes" ? (
            <AreaChart
              points={weeklyMinutes[child.id] ?? []}
              tone="brand"
              valueSuffix=" min"
              ariaLabel={`${child.name} weekly learning minutes`}
              summaryLabel={`${(weeklyMinutes[child.id] ?? []).reduce((sum, p) => sum + p.value, 0)} minutes this week`}
            />
          ) : (
            <BarChart
              points={weeklyLessons[child.id] ?? []}
              tone="mint"
              ariaLabel={`${child.name} weekly lessons completed`}
            />
          )}
        </ChartCard>

        <SubjectStrengthCard strengths={subjectStrength[child.id] ?? []} />

        <AiRecommendationCard recommendation={recommendationFor(child.id)} childName={child.name} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <ActivityFeed
          events={activityFor(child.id)}
          title={t("parent.recentActivity")}
          emptyLabel={t("state.emptyBody")}
          limit={6}
          href="/progress"
        />

        <div className="space-y-5">
          {/* Daily goal */}
          <Card>
            <CardHeader title={t("parent.todaysGoal")} subtitle={child.name} />
            <CardBody className="flex items-center gap-5">
              <ProgressRing
                value={goalPercent}
                size={110}
                tone={goalPercent >= 100 ? "mint" : "brand"}
                label={`${goalPercent}% of today's goal`}
              >
                <div>
                  <p className="t-h2 font-extrabold text-content tabular-nums">
                    {child.dailyGoalCompleted + gains.lessonsCompleted}
                  </p>
                  <p className="t-caption text-content-secondary">/ {child.dailyGoalLessons}</p>
                </div>
              </ProgressRing>
              <div className="min-w-0 flex-1">
                <p className="t-body-sm font-semibold text-content">
                  {t("parent.goalProgress", {
                    done: child.dailyGoalCompleted + gains.lessonsCompleted,
                    total: child.dailyGoalLessons,
                  })}
                </p>
                <p className="t-caption mt-1 text-content-secondary">
                  {goalPercent >= 100
                    ? "Goal reached — everything else today is a bonus."
                    : `${child.dailyGoalLessons - child.dailyGoalCompleted - gains.lessonsCompleted} more to go.`}
                </p>
                <Link
                  href="/kids"
                  className="t-label mt-3 inline-flex rounded-sm bg-primary-soft px-3 py-1.5 text-primary hover:bg-primary-soft-strong"
                >
                  {t("nav.kidMode")} →
                </Link>
              </div>
            </CardBody>
          </Card>

          {/* Latest medals */}
          <Card>
            <CardHeader
              title={t("rewards.medals")}
              action={
                <Link href="/achievements" className="t-label text-primary hover:underline">
                  {t("common.viewAll")}
                </Link>
              }
            />
            <CardBody className="grid grid-cols-4 gap-3">
              {unlockedAchievements.slice(0, 4).map((achievement) => (
                <Link
                  key={achievement.id}
                  href="/achievements"
                  className="tactile flex flex-col items-center gap-2 rounded-lg border border-border p-3 text-center"
                >
                  <span
                    className={cn("grid h-11 w-11 place-items-center rounded-full text-2xl", toneStyles[achievement.tone].soft)}
                    aria-hidden
                  >
                    {achievement.glyph}
                  </span>
                  <span className="t-caption line-clamp-2 font-semibold text-content">{achievement.title}</span>
                </Link>
              ))}
            </CardBody>
          </Card>

          {/* Child summary */}
          <Card>
            <CardBody className="flex items-center gap-4 pt-5">
              <Avatar spec={child.avatar} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="t-h4 truncate text-content">{child.name}</p>
                <p className="t-caption text-content-secondary">
                  {calculateAge(child.birthDate, NOW)} years · Level {child.level} · {child.accuracy}% accuracy
                </p>
              </div>
              <Link
                href={`/children/${child.id}`}
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
