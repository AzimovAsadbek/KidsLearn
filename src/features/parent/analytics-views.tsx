"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { toneStyles } from "@/lib/tone";
import { useT } from "@/i18n/provider";
import { useAppStore, useGains } from "@/store/app-store";
import { children, getChild } from "@/data/children";
import { getSubject, subjects } from "@/data/subjects";
import {
  consistencyGrid,
  monthlyMinutes,
  subjectStrength,
  weeklyAccuracy,
  weeklyLessons,
  weeklyMinutes,
  xpGrowth,
} from "@/data/analytics";
import { PageHeading } from "@/components/layout/app-shell";
import { Card, CardBody, CardHeader, ChartCard } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Tabs } from "@/components/ui/tabs";
import { Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AreaChart } from "@/components/charts/area-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { HeatGrid } from "@/components/charts/heat-grid";
import { SubjectStrengthCard } from "./dashboard-widgets";

/* ============================================================================
   Progress — the "how is my child doing?" view
   ========================================================================== */

export function ProgressView() {
  const t = useT();
  const childId = useAppStore((s) => s.selectedChildId);
  const child = getChild(childId);
  const gains = useGains(childId);
  const [range, setRange] = useState<"week" | "month">("week");

  const strengths = subjectStrength[childId] ?? [];
  const strongest = strengths[0];
  const hardest = strengths[strengths.length - 1];

  return (
    <div className="mx-auto w-full max-w-[95rem] space-y-6">
      <PageHeading
        title={t("nav.progress")}
        subtitle={`${child.name}'s learning journey, in detail.`}
        actions={
          <Button variant="secondary" leadingIcon={<Download className="h-4 w-4" />}>
            Export report
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard tone="brand" glyph="⏱️" label="Total time" value={formatDuration(child.minutesLearned + gains.minutes)} />
        <StatCard tone="mint" glyph="📗" label={t("parent.lessonsCompleted")} value={child.lessonsCompleted + gains.lessonsCompleted} />
        <StatCard tone="blossom" glyph="🎮" label="Games played" value={child.gamesPlayed + gains.gamesPlayed} />
        <StatCard tone="sun" glyph="⭐" label={t("common.stars")} value={child.stars + gains.stars} />
        <StatCard tone="grape" glyph="⚡" label={t("common.xp")} value={child.xp + gains.xp} />
        <StatCard tone="coral" glyph="🔥" label={t("common.streak")} value={child.streakDays} unit={t("common.days")} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <ChartCard
          title={range === "week" ? t("parent.weeklyProgress") : "Monthly progress"}
          subtitle="Minutes of focused learning"
          action={
            <Tabs
              variant="segmented"
              ariaLabel="Range"
              value={range}
              onChange={setRange}
              items={[
                { id: "week", label: t("common.weekly") },
                { id: "month", label: t("common.monthly") },
              ]}
            />
          }
        >
          <AreaChart
            points={(range === "week" ? weeklyMinutes[childId] : monthlyMinutes[childId]) ?? []}
            tone="brand"
            valueSuffix=" min"
            ariaLabel="Learning minutes"
          />
        </ChartCard>

        <SubjectStrengthCard strengths={strengths} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <ChartCard title="Lessons completed" subtitle={t("common.thisWeek")}>
          <BarChart points={weeklyLessons[childId] ?? []} tone="mint" ariaLabel="Lessons completed per day" />
        </ChartCard>

        <ChartCard title="Accuracy" subtitle="Share of correct answers">
          <AreaChart points={weeklyAccuracy[childId] ?? []} tone="lagoon" valueSuffix="%" ariaLabel="Accuracy" />
        </ChartCard>

        <Card>
          <CardHeader title="Learning consistency" subtitle="Last 5 weeks" />
          <CardBody>
            <HeatGrid values={consistencyGrid[childId] ?? []} />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <TopicCard
          title="Strongest topic"
          subjectId={strongest?.subjectId ?? subjects[0].id}
          score={strongest?.score ?? 0}
          tone="mint"
          note="Keep this one warm with a short game each week."
        />
        <TopicCard
          title="Needs practice"
          subjectId={hardest?.subjectId ?? subjects[1].id}
          score={hardest?.score ?? 0}
          tone="tangerine"
          note="Ten focused minutes a day moves this fastest."
        />
      </div>
    </div>
  );
}

function TopicCard({
  title,
  subjectId,
  score,
  tone,
  note,
}: {
  title: string;
  subjectId: string;
  score: number;
  tone: "mint" | "tangerine";
  note: string;
}) {
  const subject = getSubject(subjectId);
  return (
    <Card>
      <CardBody className="flex items-center gap-4 pt-5">
        <span className={cn("grid h-16 w-16 shrink-0 place-items-center rounded-xl text-3xl", toneStyles[subject.tone].soft)} aria-hidden>
          {subject.glyph}
        </span>
        <div className="min-w-0 flex-1">
          <p className="t-overline text-content-tertiary">{title}</p>
          <p className="t-h3 mt-0.5 text-content">{subject.name}</p>
          <p className="t-caption mt-1 text-content-secondary">{note}</p>
        </div>
        <Badge tone={tone}>{score}%</Badge>
      </CardBody>
    </Card>
  );
}

/* ============================================================================
   Statistics — the analyst view, with real filters
   ========================================================================== */

type Period = "daily" | "weekly" | "monthly" | "yearly";

export function StatisticsView() {
  const t = useT();
  const selectedChildId = useAppStore((s) => s.selectedChildId);
  const [period, setPeriod] = useState<Period>("weekly");
  const [childFilter, setChildFilter] = useState<string>(selectedChildId);
  const [subjectFilter, setSubjectFilter] = useState<string>("");
  const [activityFilter, setActivityFilter] = useState<string>("all");

  const child = getChild(childFilter);

  const minutes = useMemo(() => {
    if (period === "monthly" || period === "yearly") return monthlyMinutes[childFilter] ?? [];
    return weeklyMinutes[childFilter] ?? [];
  }, [period, childFilter]);

  const strengths = subjectStrength[childFilter] ?? [];
  const donutSlices = strengths.map((entry) => {
    const subject = getSubject(entry.subjectId);
    return { label: subject.name, value: entry.score, tone: subject.tone };
  });

  return (
    <div className="mx-auto w-full max-w-[95rem] space-y-6">
      <PageHeading
        title={t("nav.statistics")}
        subtitle="Filter by child, period, subject and activity type."
        actions={
          <Button variant="secondary" leadingIcon={<Download className="h-4 w-4" />}>
            Export CSV
          </Button>
        }
      />

      <Card>
        <CardBody className="flex flex-wrap items-end gap-3 pt-5">
          <Tabs
            variant="segmented"
            ariaLabel="Period"
            value={period}
            onChange={setPeriod}
            items={[
              { id: "daily", label: t("common.daily") },
              { id: "weekly", label: t("common.weekly") },
              { id: "monthly", label: t("common.monthly") },
              { id: "yearly", label: t("common.yearly") },
            ]}
          />

          <div className="ml-auto flex flex-wrap gap-3">
            <Select aria-label="Child" value={childFilter} onChange={(e) => setChildFilter(e.target.value)} className="w-40">
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Subject"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-44"
            >
              <option value="">All subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Activity type"
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
              className="w-40"
            >
              <option value="all">All activity</option>
              <option value="lessons">Lessons only</option>
              <option value="games">Games only</option>
            </Select>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone="brand" glyph="⏱️" label="Learning time" value={formatDuration(child.minutesLearned)} delta={{ value: 12, suffix: "%", label: "vs last period" }} />
        <StatCard tone="mint" glyph="📗" label={t("parent.lessonsCompleted")} value={child.lessonsCompleted} delta={{ value: 8, suffix: "%", label: "vs last period" }} />
        <StatCard tone="lagoon" glyph="🎯" label="Accuracy" value={`${child.accuracy}%`} delta={{ value: 3, suffix: "pt", label: "vs last period" }} />
        <StatCard tone="grape" glyph="⚡" label="XP earned" value={child.xp} delta={{ value: 15, suffix: "%", label: "vs last period" }} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <ChartCard title="Learning time" subtitle={`${child.name} · ${t(`common.${period}` as "common.daily")}`}>
          <AreaChart points={minutes} tone="brand" valueSuffix=" min" ariaLabel="Learning time" />
        </ChartCard>

        <ChartCard title="Subject performance" subtitle="Share of correct answers by subject">
          <DonutChart
            slices={donutSlices}
            ariaLabel="Subject performance"
            centre={
              <div>
                <p className="t-h2 font-extrabold text-content tabular-nums">{child.accuracy}%</p>
                <p className="t-caption font-semibold text-content-secondary">Overall</p>
              </div>
            }
          />
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <ChartCard title="Completed lessons" subtitle={t("common.thisWeek")}>
          <BarChart points={weeklyLessons[childFilter] ?? []} tone="mint" ariaLabel="Completed lessons" />
        </ChartCard>
        <ChartCard title="Game performance" subtitle="Average accuracy per day">
          <AreaChart points={weeklyAccuracy[childFilter] ?? []} tone="blossom" valueSuffix="%" ariaLabel="Game performance" />
        </ChartCard>
        <ChartCard title="XP growth" subtitle="Cumulative">
          <AreaChart points={xpGrowth[childFilter] ?? []} tone="grape" valueSuffix=" XP" ariaLabel="XP growth" />
        </ChartCard>
      </div>

      <Card>
        <CardHeader title="Streak calendar" subtitle="Every square is one day of learning" />
        <CardBody>
          <HeatGrid values={consistencyGrid[childFilter] ?? []} />
        </CardBody>
      </Card>
    </div>
  );
}
