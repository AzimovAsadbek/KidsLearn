"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { toneStyles, type Tone } from "@/lib/tone";
import { useT } from "@/i18n/provider";
import type { StatisticsPreset } from "@kidslearn/types";
import { useChildContext } from "@/components/providers/child-provider";
import { fetchStatistics, queryKeys } from "@/lib/api/queries";
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
import { EmptyState, SkeletonChart, SkeletonStatGrid } from "@/components/ui/states";
import { SubjectStrengthCard } from "./dashboard-widgets";

function toneOf(tone: string) {
  return toneStyles[tone as Tone] ?? toneStyles.brand;
}

/** Shared loading/empty guard for both analytics screens. */
function useChildStatistics(preset: StatisticsPreset) {
  const { selectedChild, loading } = useChildContext();
  const query = useQuery({
    queryKey: queryKeys.statistics(selectedChild?.id ?? "none", preset),
    queryFn: () => fetchStatistics(selectedChild!.id, preset),
    enabled: Boolean(selectedChild?.id),
  });
  return { child: selectedChild, childrenLoading: loading, query };
}

/* ============================================================================
   Progress — the "how is my child doing?" view
   ========================================================================== */

export function ProgressView() {
  const t = useT();
  const [preset, setPreset] = useState<StatisticsPreset>("week");
  const { child, childrenLoading, query } = useChildStatistics(preset);

  if (childrenLoading || query.isLoading) {
    return (
      <div className="mx-auto w-full max-w-[95rem] space-y-6" aria-busy="true">
        <SkeletonStatGrid count={6} />
        <SkeletonChart />
      </div>
    );
  }

  if (!child) {
    return <EmptyState glyph="👶" title="No child selected" body="Add a child to start tracking progress." />;
  }

  const stats = query.data;
  const progress = child.progress;
  const strengths = stats?.subjectStrength ?? [];
  const strongest = strengths[0];
  const weakest = [...strengths].sort((a, b) => a.score - b.score)[0];

  return (
    <div className="mx-auto w-full max-w-[95rem] space-y-6">
      <PageHeading
        title={t("nav.progress")}
        subtitle={`${child.name}'s learning journey, in detail.`}
        actions={
          <Button variant="secondary" leadingIcon={<Download className="h-4 w-4" />} onClick={() => window.print()}>
            Export report
          </Button>
        }
      />

      <Tabs
        variant="segmented"
        ariaLabel="Range"
        value={preset}
        onChange={setPreset}
        items={[
          { id: "today", label: t("common.today") },
          { id: "week", label: t("common.weekly") },
          { id: "month", label: t("common.monthly") },
          { id: "year", label: t("common.yearly") },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard tone="brand" glyph="⏱️" label="Total time" value={formatDuration(Math.round((progress?.learningSeconds ?? 0) / 60))} />
        <StatCard tone="mint" glyph="📗" label={t("parent.lessonsCompleted")} value={progress?.lessonsCompleted ?? 0} />
        <StatCard tone="blossom" glyph="🎮" label="Games played" value={progress?.gamesPlayed ?? 0} />
        <StatCard tone="sun" glyph="⭐" label={t("common.stars")} value={progress?.stars ?? 0} />
        <StatCard tone="grape" glyph="⚡" label={t("common.xp")} value={progress?.xp ?? 0} />
        <StatCard tone="coral" glyph="🔥" label={t("common.streak")} value={progress?.currentStreak ?? 0} unit={t("common.days")} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <ChartCard title={t("parent.weeklyProgress")} subtitle="Minutes of focused learning">
          <AreaChart points={stats?.series.learningMinutes ?? []} tone="brand" valueSuffix=" min" ariaLabel="Learning minutes" />
        </ChartCard>
        <SubjectStrengthCard strengths={strengths} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <ChartCard title="Lessons completed" subtitle="Per day">
          <BarChart points={stats?.series.lessons ?? []} tone="mint" ariaLabel="Lessons completed per day" />
        </ChartCard>
        <ChartCard title="Accuracy" subtitle="Share of correct answers">
          <AreaChart points={stats?.series.accuracy ?? []} tone="lagoon" valueSuffix="%" ariaLabel="Accuracy" />
        </ChartCard>
        <Card>
          <CardHeader title="Learning consistency" subtitle="Last 5 weeks" />
          <CardBody>
            <HeatGrid values={(stats?.consistency ?? []).map((day) => day.level)} />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {strongest ? (
          <TopicCard title="Strongest topic" entry={strongest} tone="mint" note="Keep this warm with a short game each week." />
        ) : null}
        {weakest && weakest !== strongest ? (
          <TopicCard title="Needs practice" entry={weakest} tone="tangerine" note="Ten focused minutes a day moves this fastest." />
        ) : null}
      </div>
    </div>
  );
}

function TopicCard({
  title,
  entry,
  tone,
  note,
}: {
  title: string;
  entry: { subjectName: string; glyph: string; tone: string; score: number };
  tone: "mint" | "tangerine";
  note: string;
}) {
  return (
    <Card>
      <CardBody className="flex items-center gap-4 pt-5">
        <span className={cn("grid h-16 w-16 shrink-0 place-items-center rounded-xl text-3xl", toneOf(entry.tone).soft)} aria-hidden>
          {entry.glyph}
        </span>
        <div className="min-w-0 flex-1">
          <p className="t-overline text-content-tertiary">{title}</p>
          <p className="t-h3 mt-0.5 text-content">{entry.subjectName}</p>
          <p className="t-caption mt-1 text-content-secondary">{note}</p>
        </div>
        <Badge tone={tone}>{entry.score}%</Badge>
      </CardBody>
    </Card>
  );
}

/* ============================================================================
   Statistics — the analyst view
   ========================================================================== */

export function StatisticsView() {
  const t = useT();
  const [preset, setPreset] = useState<StatisticsPreset>("week");
  const { children, selectedChild, selectChild } = useChildContext();
  const { query } = useChildStatistics(preset);

  const stats = query.data;
  const donut = (stats?.subjectStrength ?? []).map((entry) => ({
    label: entry.subjectName,
    value: entry.totalAnswers,
    tone: (entry.tone as Tone) ?? "brand",
  }));

  return (
    <div className="mx-auto w-full max-w-[95rem] space-y-6">
      <PageHeading
        title={t("nav.statistics")}
        subtitle="Filter by child and period. Every figure is computed from real activity."
        actions={
          <Button variant="secondary" leadingIcon={<Download className="h-4 w-4" />} onClick={() => window.print()}>
            Export
          </Button>
        }
      />

      <Card>
        <CardBody className="flex flex-wrap items-end gap-3 pt-5">
          <Tabs
            variant="segmented"
            ariaLabel="Period"
            value={preset}
            onChange={setPreset}
            items={[
              { id: "today", label: t("common.daily") },
              { id: "week", label: t("common.weekly") },
              { id: "month", label: t("common.monthly") },
              { id: "year", label: t("common.yearly") },
            ]}
          />
          <div className="ml-auto">
            <Select
              aria-label="Child"
              value={selectedChild?.id ?? ""}
              onChange={(e) => selectChild(e.target.value)}
              className="w-44"
            >
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </Select>
          </div>
        </CardBody>
      </Card>

      {query.isLoading ? (
        <SkeletonStatGrid />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            tone="brand"
            glyph="⏱️"
            label="Learning time"
            value={formatDuration(Math.round((stats?.learningSeconds ?? 0) / 60))}
            delta={{ value: stats?.deltas.learningSeconds ?? 0, suffix: "%", label: "vs last period" }}
          />
          <StatCard
            tone="mint"
            glyph="📗"
            label={t("parent.lessonsCompleted")}
            value={stats?.lessonsCompleted ?? 0}
            delta={{ value: stats?.deltas.lessonsCompleted ?? 0, suffix: "%", label: "vs last period" }}
          />
          <StatCard
            tone="lagoon"
            glyph="🎯"
            label="Accuracy"
            value={`${stats?.accuracy ?? 0}%`}
            delta={{ value: stats?.deltas.accuracy ?? 0, suffix: "pt", label: "vs last period" }}
          />
          <StatCard
            tone="grape"
            glyph="⚡"
            label="XP earned"
            value={stats?.xpEarned ?? 0}
            delta={{ value: stats?.deltas.xpEarned ?? 0, suffix: "%", label: "vs last period" }}
          />
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <ChartCard title="Learning time" subtitle={selectedChild?.name ?? ""}>
          <AreaChart points={stats?.series.learningMinutes ?? []} tone="brand" valueSuffix=" min" ariaLabel="Learning time" />
        </ChartCard>

        <ChartCard title="Subject performance" subtitle="Questions answered by subject">
          {donut.length === 0 ? (
            <p className="t-body-sm py-10 text-center text-content-secondary">
              Subject data appears once questions have been answered.
            </p>
          ) : (
            <DonutChart
              slices={donut}
              ariaLabel="Subject performance"
              centre={
                <div>
                  <p className="t-h2 font-extrabold text-content tabular-nums">{stats?.accuracy ?? 0}%</p>
                  <p className="t-caption font-semibold text-content-secondary">Overall</p>
                </div>
              }
            />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <ChartCard title="Completed lessons" subtitle="Per day">
          <BarChart points={stats?.series.lessons ?? []} tone="mint" ariaLabel="Completed lessons" />
        </ChartCard>
        <ChartCard title="Accuracy trend" subtitle="Per day">
          <AreaChart points={stats?.series.accuracy ?? []} tone="blossom" valueSuffix="%" ariaLabel="Accuracy trend" />
        </ChartCard>
        <ChartCard title="XP earned" subtitle="Per day">
          <AreaChart points={stats?.series.xp ?? []} tone="grape" valueSuffix=" XP" ariaLabel="XP earned" />
        </ChartCard>
      </div>

      <Card>
        <CardHeader title="Streak calendar" subtitle="Every square is one day of learning" />
        <CardBody>
          <HeatGrid values={(stats?.consistency ?? []).map((day) => day.level)} />
        </CardBody>
      </Card>
    </div>
  );
}
