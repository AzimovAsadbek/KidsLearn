"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Info, RefreshCw, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneStyles, type Tone } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import type { AiJobDto } from "@kidslearn/types";
import { ApiError } from "@/lib/api/client";
import { fetchAiJobs, fetchAiStatus, fetchSubjects, generateAiImage, queryKeys, reviewAiJob } from "@/lib/api/queries";
import { useAppStore } from "@/store/app-store";
import { PageHeading } from "@/components/layout/app-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { EmptyState, InlineError, Skeleton } from "@/components/ui/states";
import { Pagination } from "@/components/ui/data-table";

/**
 * Style presets are prompt modifiers, not backend data — the API accepts any
 * free-form style string and stores it on the job verbatim.
 */
const STYLE_PRESETS = [
  { id: "cartoon", value: "Cute cartoon illustration", key: "ai.styleCartoon", glyph: "🎨" },
  { id: "watercolor", value: "Soft watercolour illustration", key: "ai.styleWatercolor", glyph: "🖌️" },
  { id: "flat", value: "Flat vector illustration", key: "ai.styleFlat", glyph: "🔷" },
  { id: "soft3d", value: "Soft 3D render", key: "ai.styleSoft3d", glyph: "🧸" },
] as const;

const AGE_OPTIONS = [
  { value: "AGE_1_2", key: "age.band1_2" },
  { value: "AGE_3_4", key: "age.band3_4" },
  { value: "AGE_5_7", key: "age.band5_7" },
] as const;

const JOB_STATUS: Record<string, { key: "ai.statusQueued" | "ai.statusRunning" | "ai.statusAwaitingReview" | "ai.statusApproved" | "ai.statusRejected" | "ai.statusFailed" | "ai.statusPreviewOnly"; tone: Tone }> = {
  QUEUED: { key: "ai.statusQueued", tone: "sky" },
  RUNNING: { key: "ai.statusRunning", tone: "sky" },
  AWAITING_REVIEW: { key: "ai.statusAwaitingReview", tone: "sun" },
  APPROVED: { key: "ai.statusApproved", tone: "mint" },
  REJECTED: { key: "ai.statusRejected", tone: "coral" },
  FAILED: { key: "ai.statusFailed", tone: "coral" },
  PREVIEW_ONLY: { key: "ai.statusPreviewOnly", tone: "grape" },
};

/** Any finished-but-undecided job can be approved or rejected. */
const REVIEWABLE = new Set(["AWAITING_REVIEW", "PREVIEW_ONLY"]);

const JOBS_PAGE_SIZE = 8;

function JobStatusBadge({ status }: { status: string }) {
  const t = useT();
  const meta = JOB_STATUS[status] ?? JOB_STATUS.QUEUED;
  return (
    <Badge tone={meta.tone} size="sm">
      <span className={cn("h-1.5 w-1.5 rounded-full", toneStyles[meta.tone].solid)} aria-hidden />
      {t(meta.key)}
    </Badge>
  );
}

function JobThumb({ job, className }: { job: AiJobDto; className?: string }) {
  if (job.media?.url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={job.media.url} alt="" loading="lazy" className={cn("h-full w-full object-cover", className)} />
    );
  }
  return (
    <span className={cn("grid h-full w-full place-items-center bg-surface-muted", className)} aria-hidden>
      🤖
    </span>
  );
}

/** meta.total for one job status — powers the pending badge honestly. */
function useJobCount(status: string) {
  return useQuery({
    queryKey: queryKeys.aiJobs({ status, purpose: "count" }),
    queryFn: () => fetchAiJobs({ status, page: 1, limit: 1 }),
    select: (page) => page.meta.total,
  });
}

export function AiGeneratorView() {
  const t = useT();
  const { locale, plural } = useI18n();
  const pushToast = useAppStore((s) => s.pushToast);
  const queryClient = useQueryClient();

  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<string>(STYLE_PRESETS[0].id);
  const [ageCategory, setAgeCategory] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [result, setResult] = useState<AiJobDto | null>(null);
  const [jobsPage, setJobsPage] = useState(1);

  const providerStatus = useQuery({ queryKey: queryKeys.aiStatus, queryFn: fetchAiStatus });
  const subjects = useQuery({ queryKey: [...queryKeys.subjects, locale], queryFn: () => fetchSubjects(locale) });
  const jobs = useQuery({
    queryKey: queryKeys.aiJobs({ page: jobsPage, limit: JOBS_PAGE_SIZE }),
    queryFn: () => fetchAiJobs({ page: jobsPage, limit: JOBS_PAGE_SIZE }),
    placeholderData: (previous) => previous,
  });
  const awaitingCount = useJobCount("AWAITING_REVIEW");
  const previewCount = useJobCount("PREVIEW_ONLY");
  const pendingCount = (awaitingCount.data ?? 0) + (previewCount.data ?? 0);

  function invalidateJobs() {
    void queryClient.invalidateQueries({ queryKey: ["ai", "jobs"] });
    void queryClient.invalidateQueries({ queryKey: ["media"] });
  }

  const generate = useMutation({
    mutationFn: () =>
      generateAiImage({
        prompt: prompt.trim(),
        style: STYLE_PRESETS.find((preset) => preset.id === style)?.value,
        ageCategory: ageCategory || undefined,
        subjectId: subjectId || undefined,
      }),
    onSuccess: (job) => {
      setResult(job);
      invalidateJobs();
    },
    onError: (error) => {
      pushToast({
        title: t("ai.generateFailed"),
        description: error instanceof ApiError ? error.message : undefined,
        tone: "coral",
        glyph: "⚠️",
      });
    },
  });

  const review = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) => reviewAiJob(id, approve),
    onSuccess: (updated, variables) => {
      pushToast({
        title: variables.approve ? t("ai.jobApproved") : t("ai.jobRejected"),
        tone: variables.approve ? "mint" : "coral",
        glyph: variables.approve ? "✅" : "🚫",
      });
      setResult((current) => (current && current.id === updated.id ? updated : current));
      invalidateJobs();
    },
    onError: (error) => {
      pushToast({
        title: t("state.errorTitle"),
        description: error instanceof ApiError ? error.message : undefined,
        tone: "coral",
        glyph: "⚠️",
      });
    },
  });

  const previewMode = providerStatus.data ? !providerStatus.data.imageGeneration.configured : false;
  const queue = jobs.data?.items ?? [];
  const jobsTotal = jobs.data?.meta.total ?? 0;

  return (
    <div className="mx-auto w-full max-w-[95rem] space-y-6">
      <PageHeading
        title={t("nav.aiGenerator")}
        subtitle={t("ai.generatorSubtitle")}
        actions={previewMode ? <Badge tone="grape">{t("ai.statusPreviewOnly")}</Badge> : <Badge tone="grape">{t("common.beta")}</Badge>}
      />

      {previewMode ? (
        <div role="note" className="flex items-start gap-3 rounded-xl border border-info/30 bg-info-soft px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden />
          <p className="t-body-sm text-content">
            <strong className="font-semibold">{t("ai.previewModeTitle")}</strong> {t("ai.previewModeBody")}
          </p>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_1.15fr]">
        {/* ---- Prompt ---------------------------------------------------- */}
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-[0.5rem] bg-grape-soft dark:bg-grape-core/20">
                  <Sparkles className="h-4 w-4 text-grape-deep dark:text-grape-core" aria-hidden />
                </span>
                {t("ai.generateImage")}
              </span>
            }
          />
          <CardBody className="space-y-4">
            <Field label={t("ai.prompt")} hint={t("ai.promptHint")} required>
              {({ id, describedBy }) => (
                <Textarea
                  id={id}
                  aria-describedby={describedBy}
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              )}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("ai.style")}>
                {({ id }) => (
                  <Select id={id} value={style} onChange={(e) => setStyle(e.target.value)}>
                    {STYLE_PRESETS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.glyph} {t(option.key)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field label={t("ai.ageRange")}>
                {({ id }) => (
                  <Select id={id} value={ageCategory} onChange={(e) => setAgeCategory(e.target.value)}>
                    <option value="">{t("filter.allAges")}</option>
                    {AGE_OPTIONS.map((band) => (
                      <option key={band.value} value={band.value}>
                        {t(band.key)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field label={t("admin.colSubject")} className="sm:col-span-2">
                {({ id }) => (
                  <Select id={id} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                    <option value="">{t("filter.allSubjects")}</option>
                    {(subjects.data ?? []).map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.glyph} {subject.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            <Button
              size="lg"
              fullWidth
              loading={generate.isPending}
              leadingIcon={<Sparkles className="h-4 w-4" />}
              onClick={() => generate.mutate()}
              disabled={prompt.trim().length < 8}
            >
              {generate.isPending ? t("ai.generating") : t("ai.generate")}
            </Button>

            <p className="t-caption text-content-secondary">{t("ai.reviewNote")}</p>
          </CardBody>
        </Card>

        {/* ---- Result ---------------------------------------------------- */}
        <Card className="flex flex-col">
          <CardHeader
            title={t("ai.resultTitle")}
            subtitle={result && !generate.isPending ? t("ai.resultReadySubtitle") : t("ai.resultIdleSubtitle")}
          />
          <CardBody className="flex flex-1 flex-col">
            {generate.isPending ? (
              <div className="flex-1">
                <Skeleton className="aspect-square w-full rounded-xl" />
                <p className="t-body-sm mt-4 flex items-center justify-center gap-2 font-semibold text-content-secondary">
                  <Sparkles className="h-4 w-4 animate-pulse text-grape-core" aria-hidden />
                  {t("ai.generating")}
                </p>
              </div>
            ) : result ? (
              <div className="flex-1">
                <div className="aspect-square w-full overflow-hidden rounded-xl border border-border bg-surface-muted text-8xl">
                  <JobThumb job={result} />
                </div>

                <dl className="mt-4 flex flex-wrap gap-2">
                  {result.style ? (
                    <Badge tone="grape" size="sm">
                      {result.style}
                    </Badge>
                  ) : null}
                  {result.ageCategory ? (
                    <Badge tone="sky" size="sm">
                      {t(AGE_OPTIONS.find((band) => band.value === result.ageCategory)?.key ?? "age.band1_2")}
                    </Badge>
                  ) : null}
                  {result.subjectId ? (
                    <Badge tone="mint" size="sm">
                      {(subjects.data ?? []).find((subject) => subject.id === result.subjectId)?.name ?? ""}
                    </Badge>
                  ) : null}
                  <JobStatusBadge status={result.status} />
                </dl>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    leadingIcon={<RefreshCw className="h-4 w-4" />}
                    variant="secondary"
                    disabled={generate.isPending}
                    onClick={() => generate.mutate()}
                  >
                    {t("ai.regenerate")}
                  </Button>
                  {REVIEWABLE.has(result.status) ? (
                    <>
                      <Button
                        leadingIcon={<Check className="h-4 w-4" />}
                        loading={review.isPending && review.variables?.approve === true}
                        onClick={() => review.mutate({ id: result.id, approve: true })}
                      >
                        {t("ai.approve")}
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-danger"
                        leadingIcon={<X className="h-4 w-4" />}
                        loading={review.isPending && review.variables?.approve === false}
                        onClick={() => review.mutate({ id: result.id, approve: false })}
                      >
                        {t("ai.reject")}
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="grid flex-1 place-items-center rounded-xl border-2 border-dashed border-border-strong p-10 text-center">
                <div>
                  <span className="text-5xl" aria-hidden>
                    🖼️
                  </span>
                  <p className="t-h4 mt-3 text-content">{t("ai.nothingYetTitle")}</p>
                  <p className="t-body-sm mt-1 max-w-xs text-content-secondary">{t("ai.nothingYetBody")}</p>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ---- Review queue ------------------------------------------------- */}
      <Card>
        <CardHeader
          title={t("ai.reviewQueue")}
          subtitle={plural("plural.jobs", jobsTotal)}
          action={pendingCount > 0 ? <Badge tone="sun">{t("ai.pendingBadge", { count: pendingCount })}</Badge> : null}
        />
        <CardBody>
          {jobs.isLoading ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <li key={i}>
                  <div className="shimmer aspect-square rounded-xl" />
                </li>
              ))}
            </ul>
          ) : jobs.isError ? (
            <InlineError message={t("state.errorBody")} onRetry={() => void jobs.refetch()} retryLabel={t("common.retry")} />
          ) : queue.length === 0 ? (
            <EmptyState compact glyph="🤖" title={t("state.emptyTitle")} body={t("state.emptyBody")} />
          ) : (
            <>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {queue.map((job) => (
                  <li key={job.id} className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
                    <div className="aspect-square overflow-hidden text-6xl">
                      <JobThumb job={job} />
                    </div>
                    <div className="p-3">
                      <p className="t-caption line-clamp-2 text-content-secondary">{job.prompt}</p>
                      <div className="mt-2">
                        <JobStatusBadge status={job.status} />
                      </div>

                      {REVIEWABLE.has(job.status) ? (
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            fullWidth
                            leadingIcon={<Check className="h-3.5 w-3.5" />}
                            disabled={review.isPending}
                            onClick={() => review.mutate({ id: job.id, approve: true })}
                          >
                            {t("ai.approve")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-danger"
                            aria-label={`${t("ai.reject")}: ${job.prompt}`}
                            disabled={review.isPending}
                            onClick={() => review.mutate({ id: job.id, approve: false })}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : job.error ? (
                        <p className="t-caption mt-2 font-medium text-danger">{job.error}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
              {(jobs.data?.meta.totalPages ?? 1) > 1 ? (
                <Pagination
                  className="mt-4"
                  page={jobsPage}
                  totalPages={jobs.data?.meta.totalPages ?? 1}
                  totalItems={jobsTotal}
                  onChange={setJobsPage}
                />
              ) : null}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
