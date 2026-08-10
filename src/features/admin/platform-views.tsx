"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { cn, formatCompact, formatDuration, formatNumber } from "@/lib/utils";
import { toneStyles } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import { advancedMetrics } from "@/data/admin";
import {
  dailyActivity,
  lessonCompletionTrend,
  platformGrowth,
  retentionCohort,
  subjectShare,
  userGrowthWeekly,
} from "@/data/analytics";
import { getSubject } from "@/data/subjects";
import { lessons } from "@/data/lessons";
import { games } from "@/data/games";
import { LOCALES } from "@/i18n/config";
import { useAppStore } from "@/store/app-store";
import { PageHeading } from "@/components/layout/app-shell";
import { Card, CardBody, CardFooter, CardHeader, ChartCard } from "@/components/ui/card";
import { MiniStat } from "@/components/ui/stat-card";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Switch } from "@/components/ui/field";
import { AreaChart } from "@/components/charts/area-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { MultiLineChart } from "@/components/charts/line-chart";

/* --- Advanced analytics --------------------------------------------------- */

export function AdminAnalyticsView() {
  const t = useT();
  const { intlLocale } = useI18n();
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("weekly");

  const topLessons = [...lessons].sort((a, b) => b.completions - a.completions).slice(0, 5);
  const topGames = [...games].sort((a, b) => b.plays - a.plays).slice(0, 5);

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      <PageHeading
        title={t("nav.statistics")}
        subtitle="Engagement, retention and content performance across the platform."
        actions={
          <Button variant="secondary" leadingIcon={<Download className="h-4 w-4" />}>
            Export CSV
          </Button>
        }
      />

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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {advancedMetrics.map((metric) => (
          <MiniStat
            key={metric.id}
            tone={metric.tone}
            glyph={metric.glyph}
            label={metric.label}
            delta={metric.deltaPercent}
            value={
              metric.format === "percent"
                ? `${metric.value}%`
                : metric.format === "duration"
                  ? formatDuration(metric.value)
                  : formatNumber(metric.value, intlLocale)
            }
          />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <ChartCard title="Platform growth" subtitle="Users, lessons and games">
          <MultiLineChart series={platformGrowth} ariaLabel="Platform growth" />
        </ChartCard>

        <ChartCard title="Retention" subtitle="Share of learners still active">
          <AreaChart points={retentionCohort} tone="lagoon" valueSuffix="%" ariaLabel="Retention curve" />
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <ChartCard title="Daily activity" subtitle="Sessions per day">
          <AreaChart points={dailyActivity} tone="brand" ariaLabel="Sessions per day" />
        </ChartCard>
        <ChartCard title="Lesson completion" subtitle="Percent finished">
          <AreaChart points={lessonCompletionTrend} tone="mint" valueSuffix="%" ariaLabel="Lesson completion rate" />
        </ChartCard>
        <ChartCard title="New users" subtitle="By week">
          <BarChart points={userGrowthWeekly} tone="grape" ariaLabel="New users" />
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr_1fr]">
        <ChartCard title="Subject share" subtitle="Of all completed activities">
          <DonutChart
            slices={subjectShare.map((slice) => ({
              label: slice.label,
              value: slice.value,
              tone: getSubject(slice.subjectId).tone,
            }))}
            size={170}
            ariaLabel="Subject share"
          />
        </ChartCard>

        <Card>
          <CardHeader title="Most popular lessons" />
          <CardBody>
            <ol className="space-y-3">
              {topLessons.map((lesson, index) => (
                <li key={lesson.id} className="flex items-center gap-3">
                  <span className="t-caption grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-muted font-bold text-content-secondary">
                    {index + 1}
                  </span>
                  <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-sm text-base", toneStyles[lesson.tone].soft)} aria-hidden>
                    {lesson.glyph}
                  </span>
                  <span className="t-body-sm min-w-0 flex-1 truncate font-semibold text-content">{lesson.title}</span>
                  <span className="t-caption shrink-0 font-bold text-content-secondary tabular-nums">
                    {formatCompact(lesson.completions)}
                  </span>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Most played games" />
          <CardBody>
            <ol className="space-y-3">
              {topGames.map((game, index) => (
                <li key={game.id} className="flex items-center gap-3">
                  <span className="t-caption grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-muted font-bold text-content-secondary">
                    {index + 1}
                  </span>
                  <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-sm text-base", toneStyles[game.tone].soft)} aria-hidden>
                    {game.glyph}
                  </span>
                  <span className="t-body-sm min-w-0 flex-1 truncate font-semibold text-content">{game.title}</span>
                  <span className="t-caption shrink-0 font-bold text-content-secondary tabular-nums">
                    {formatCompact(game.plays)}
                  </span>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

/* --- Platform settings ---------------------------------------------------- */

export function AdminSettingsView() {
  const t = useT();
  const pushToast = useAppStore((s) => s.pushToast);
  const [section, setSection] = useState<"general" | "content" | "ai" | "security">("general");
  const [flags, setFlags] = useState({
    aiRecommendations: true,
    voiceControl: true,
    leaderboard: true,
    pushNotifications: true,
    offlineLessons: true,
    aiGeneration: false,
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <PageHeading title={t("nav.settings")} subtitle="Platform-wide configuration and feature flags." />

      <Tabs
        variant="pill"
        ariaLabel="Settings sections"
        value={section}
        onChange={setSection}
        items={[
          { id: "general", label: "General" },
          { id: "content", label: t("nav.content") },
          { id: "ai", label: "AI" },
          { id: "security", label: "Security" },
        ]}
      />

      {section === "general" ? (
        <Card>
          <CardHeader title="Platform" subtitle="Identity and defaults for every new account." />
          <CardBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Platform name">{({ id }) => <Input id={id} defaultValue="KidsLearn" />}</Field>
              <Field label="Support email">{({ id }) => <Input id={id} type="email" defaultValue="help@kidslearn.app" />}</Field>
              <Field label="Default language">
                {({ id }) => (
                  <Select id={id} defaultValue="uz">
                    {LOCALES.map((locale) => (
                      <option key={locale.code} value={locale.code}>
                        {locale.flag} {locale.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Default daily goal">
                {({ id }) => (
                  <Select id={id} defaultValue="4">
                    {[2, 4, 6, 8].map((n) => (
                      <option key={n} value={n}>
                        {n} lessons
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            <div className="space-y-4 rounded-lg bg-surface-muted p-4">
              <p className="t-label text-content">Feature flags</p>
              <Switch label="AI recommendations" description="Personalised next-lesson suggestions" checked={flags.aiRecommendations} onChange={(v) => setFlags((f) => ({ ...f, aiRecommendations: v }))} />
              <Switch label="Voice control" description="Speech commands in lessons and games" checked={flags.voiceControl} onChange={(v) => setFlags((f) => ({ ...f, voiceControl: v }))} />
              <Switch label="Leaderboard" description="Public ranking by stars" checked={flags.leaderboard} onChange={(v) => setFlags((f) => ({ ...f, leaderboard: v }))} />
              <Switch label="Push notifications" description="Reminders and reward alerts" checked={flags.pushNotifications} onChange={(v) => setFlags((f) => ({ ...f, pushNotifications: v }))} />
              <Switch label="Offline lessons" description="Cache lessons for offline play" checked={flags.offlineLessons} onChange={(v) => setFlags((f) => ({ ...f, offlineLessons: v }))} />
            </div>
          </CardBody>
          <CardFooter className="justify-end">
            <Button onClick={() => pushToast({ title: "Platform settings saved", tone: "mint", glyph: "✅" })}>
              {t("common.save")}
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      {section === "content" ? (
        <Card>
          <CardHeader title="Content workflow" subtitle="How lessons and media move to publication." />
          <CardBody className="space-y-4">
            <Field label="Publishing model" hint="Review requires a second editor to approve.">
              {({ id }) => (
                <Select id={id} defaultValue="review">
                  <option value="direct">Publish directly</option>
                  <option value="review">Require review</option>
                  <option value="dual">Require two approvals</option>
                </Select>
              )}
            </Field>
            <Field label="Auto-archive after" hint="Unpublished drafts are archived automatically.">
              {({ id }) => (
                <Select id={id} defaultValue="90">
                  {[30, 60, 90, 180].map((days) => (
                    <option key={days} value={days}>
                      {days} days
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Maximum upload size">{({ id }) => <Input id={id} defaultValue="25 MB" />}</Field>
          </CardBody>
          <CardFooter className="justify-end">
            <Button onClick={() => pushToast({ title: "Workflow saved", tone: "mint", glyph: "✅" })}>
              {t("common.save")}
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      {section === "ai" ? (
        <Card>
          <CardHeader title="AI configuration" subtitle="Generation is disabled until a provider is connected." />
          <CardBody className="space-y-4">
            <Switch
              label="Enable AI image generation"
              description="No provider is configured in this build."
              checked={flags.aiGeneration}
              onChange={(v) => setFlags((f) => ({ ...f, aiGeneration: v }))}
            />
            <Field label="Provider endpoint" hint="Left blank, the generator stays in preview mode.">
              {({ id }) => <Input id={id} placeholder="https://api.example.com/v1/images" />}
            </Field>
            <Field label="Safety filter" hint="Applied before any asset reaches the review queue.">
              {({ id }) => (
                <Select id={id} defaultValue="strict">
                  <option value="strict">Strict (recommended for children)</option>
                  <option value="standard">Standard</option>
                </Select>
              )}
            </Field>
          </CardBody>
          <CardFooter className="justify-end">
            <Button onClick={() => pushToast({ title: "AI settings saved", tone: "grape", glyph: "🤖" })}>
              {t("common.save")}
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      {section === "security" ? (
        <Card>
          <CardHeader title="Security" subtitle="Access rules for the admin console." />
          <CardBody className="space-y-4">
            <Switch label="Require 2FA for all admins" description="Applies at the next sign-in." checked onChange={() => undefined} />
            <Field label="Session timeout">
              {({ id }) => (
                <Select id={id} defaultValue="60">
                  {[15, 30, 60, 240].map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes} minutes
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Allowed IP ranges" hint="Leave blank to allow all.">
              {({ id }) => <Input id={id} placeholder="203.0.113.0/24" />}
            </Field>
          </CardBody>
          <CardFooter className="justify-end">
            <Button onClick={() => pushToast({ title: "Security settings saved", tone: "mint", glyph: "🔒" })}>
              {t("common.save")}
            </Button>
          </CardFooter>
        </Card>
      ) : null}
    </div>
  );
}
