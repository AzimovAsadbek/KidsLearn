"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Pencil } from "lucide-react";
import { calculateAge, cn, formatDate, formatDuration, formatRelativeTime } from "@/lib/utils";
import { toneStyles } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import type { Child } from "@/types";
import { NOW } from "@/data/children";
import { activityFor } from "@/data/notifications";
import { achievements } from "@/data/rewards";
import { certificatesFor } from "@/data/rewards";
import {
  buildLeaderboard,
  consistencyGrid,
  recommendationFor,
  subjectStrength,
  weeklyAccuracy,
  weeklyMinutes,
  xpGrowth,
} from "@/data/analytics";
import { Card, CardBody, CardHeader, ChartCard } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { ProgressRing, XpBar } from "@/components/ui/progress";
import { AreaChart } from "@/components/charts/area-chart";
import { HeatGrid } from "@/components/charts/heat-grid";
import { AchievementCard } from "@/features/rewards/achievement-card";
import { LeaderboardList } from "@/features/rewards/leaderboard-list";
import { ActivityFeed, AiRecommendationCard, SubjectStrengthCard } from "./dashboard-widgets";
import { VoiceAssistantCard } from "@/features/voice/voice-assistant-card";

type TabId = "overview" | "progress" | "achievements" | "activity" | "statistics";

export function ChildProfileView({ child }: { child: Child }) {
  const t = useT();
  const { intlLocale } = useI18n();
  const [tab, setTab] = useState<TabId>("overview");

  const age = calculateAge(child.birthDate, NOW);
  const unlocked = achievements.filter((a) => a.progress >= 100);
  const certificates = certificatesFor(child.id);
  const tone = child.avatar.tone;

  return (
    <div className="mx-auto w-full max-w-[95rem] space-y-5">
      <Link
        href="/children"
        className="t-label inline-flex items-center gap-1.5 text-content-secondary hover:text-content"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("parent.childrenTitle")}
      </Link>

      {/* ---- Hero -------------------------------------------------------- */}
      <Card className="overflow-hidden">
        <div className={cn("relative h-32 sm:h-40", toneStyles[tone].gradient)}>
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
              <Avatar spec={child.avatar} size="2xl" className="ring-4 ring-surface shadow-card" />
            </div>

            <div className="min-w-0 flex-1 pb-1">
              <h1 className="t-h1 text-content">{child.name}</h1>
              <p className="t-body-sm mt-0.5 text-content-secondary">
                {age} years old · Member since {formatDate(child.joinedAt, intlLocale)}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Badge tone="sun">🏅 Gold learner</Badge>
                <Badge tone="brand">Level {child.level}</Badge>
                <Badge tone="coral">🔥 {child.streakDays}-day streak</Badge>
                <Badge tone="mint">{child.accuracy}% accuracy</Badge>
              </div>
            </div>

            <div className="flex gap-2 pb-1">
              <ButtonLink href="/kids" variant="primary" size="md">
                {t("nav.kidMode")}
              </ButtonLink>
              <Button variant="secondary" size="md" leadingIcon={<Pencil className="h-4 w-4" />}>
                {t("common.edit")}
              </Button>
            </div>
          </div>

          <div className="mt-6">
            <XpBar xp={child.xp} xpToNext={child.xpToNextLevel} level={child.level} />
          </div>
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

      {/* ---- Panels ------------------------------------------------------ */}
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          {tab === "overview" ? (
            <>
              <Card>
                <CardHeader title="Learning progress" subtitle="Against this term's plan" />
                <CardBody className="flex flex-wrap items-center gap-6">
                  <ProgressRing value={75} size={140} thickness={14} tone={tone} label="75% of the programme complete">
                    <div>
                      <p className="t-h1 font-extrabold text-content tabular-nums">75%</p>
                      <p className="t-caption font-semibold text-content-secondary">Great job!</p>
                    </div>
                  </ProgressRing>

                  <dl className="min-w-52 flex-1 space-y-3">
                    {[
                      { glyph: "📗", label: t("parent.lessonsCompleted"), value: child.lessonsCompleted },
                      { glyph: "🎮", label: "Games played", value: child.gamesPlayed },
                      { glyph: "⭐", label: t("parent.starsEarned"), value: child.stars },
                      { glyph: "⏱️", label: "Time spent", value: formatDuration(child.minutesLearned) },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between gap-4 border-b border-border pb-2.5 last:border-0 last:pb-0">
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
                <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {unlocked.slice(0, 4).map((achievement) => (
                    <AchievementCard key={achievement.id} achievement={achievement} compact />
                  ))}
                </CardBody>
              </Card>
            </>
          ) : null}

          {tab === "progress" ? (
            <>
              <ChartCard title={t("parent.weeklyProgress")} subtitle="Minutes learned per day">
                <AreaChart points={weeklyMinutes[child.id] ?? []} tone={tone} valueSuffix=" min" ariaLabel="Weekly minutes" />
              </ChartCard>
              <SubjectStrengthCard strengths={subjectStrength[child.id] ?? []} />
              <Card>
                <CardHeader title="Learning consistency" subtitle="Last 5 weeks" />
                <CardBody>
                  <HeatGrid values={consistencyGrid[child.id] ?? []} />
                </CardBody>
              </Card>
            </>
          ) : null}

          {tab === "achievements" ? (
            <Card>
              <CardHeader title={t("nav.achievements")} subtitle={`${unlocked.length} of ${achievements.length} unlocked`} />
              <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {achievements.map((achievement) => (
                  <AchievementCard key={achievement.id} achievement={achievement} />
                ))}
              </CardBody>
            </Card>
          ) : null}

          {tab === "activity" ? (
            <ActivityFeed
              events={activityFor(child.id)}
              title="All activity"
              emptyLabel="No activity recorded yet."
            />
          ) : null}

          {tab === "statistics" ? (
            <>
              <ChartCard title="Accuracy trend" subtitle="Correct answers per day">
                <AreaChart points={weeklyAccuracy[child.id] ?? []} tone="mint" valueSuffix="%" ariaLabel="Accuracy trend" />
              </ChartCard>
              <ChartCard title="XP growth" subtitle="Cumulative experience this year">
                <AreaChart points={xpGrowth[child.id] ?? []} tone="brand" valueSuffix=" XP" ariaLabel="XP growth" />
              </ChartCard>
            </>
          ) : null}
        </div>

        {/* ---- Right rail ------------------------------------------------ */}
        <div className="space-y-5">
          <AiRecommendationCard recommendation={recommendationFor(child.id)} childName={child.name} compact />

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
              <LeaderboardList entries={buildLeaderboard(child.id).slice(0, 5)} compact />
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
              {certificates.length === 0 ? (
                <p className="t-body-sm py-4 text-center text-content-secondary">
                  No certificates yet — they arrive at each programme milestone.
                </p>
              ) : (
                certificates.map((certificate) => (
                  <Link
                    key={certificate.id}
                    href={`/certificates/${certificate.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-surface-muted"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-sun-soft text-xl dark:bg-sun-core/15" aria-hidden>
                      📜
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="t-body-sm block truncate font-semibold text-content">{certificate.title}</span>
                      <span className="t-caption block text-content-secondary">
                        {formatRelativeTime(certificate.issuedAt, NOW, intlLocale)}
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
