"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, CheckCircle2, Info, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { cn, formatCompact, formatDate } from "@/lib/utils";
import { toneStyles, TONES, type Tone } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import type { LessonDto, SubjectDto } from "@kidslearn/types";
import { ApiError } from "@/lib/api/client";
import {
  changeLessonStatus,
  deleteLesson,
  fetchCategories,
  fetchLesson,
  fetchLessons,
  fetchGames,
  fetchSubjects,
  queryKeys,
  upsertCategory,
  upsertLesson,
  upsertSubject,
} from "@/lib/api/queries";
import { useAppStore } from "@/store/app-store";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { PageHeading } from "@/components/layout/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { Button, IconButton } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Badge, DifficultyBadge, StatusBadge } from "@/components/ui/badge";
import { EmptyState, ErrorState, SkeletonTable } from "@/components/ui/states";
import { Modal } from "@/components/ui/overlay";
import { LOCALES } from "@/i18n/config";

const STATUS_OPTIONS = [
  { value: "DRAFT", key: "admin.statusDraft" },
  { value: "REVIEW", key: "admin.statusReview" },
  { value: "PUBLISHED", key: "admin.statusPublished" },
  { value: "ARCHIVED", key: "admin.statusArchived" },
] as const;

const AGE_OPTIONS = [
  { value: "AGE_1_2", key: "age.band1_2" },
  { value: "AGE_3_4", key: "age.band3_4" },
  { value: "AGE_5_7", key: "age.band5_7" },
] as const;

const DIFFICULTY_OPTIONS = [
  { value: "EASY", key: "lesson.difficultyEasy" },
  { value: "MEDIUM", key: "lesson.difficultyMedium" },
  { value: "HARD", key: "lesson.difficultyHard" },
] as const;

const AGE_KEY = { AGE_1_2: "age.band1_2", AGE_3_4: "age.band3_4", AGE_5_7: "age.band5_7" } as const;

const DIFFICULTY_KEY = {
  EASY: "lesson.difficultyEasy",
  MEDIUM: "lesson.difficultyMedium",
  HARD: "lesson.difficultyHard",
} as const;

const EDITOR_LOCALES = ["en", "ru", "uz"] as const;
type EditorLocale = (typeof EDITOR_LOCALES)[number];

const PAGE_SIZE = 10;

function toneOf(tone: string): Tone {
  return (TONES as readonly string[]).includes(tone) ? (tone as Tone) : "brand";
}

function statusProp(status: string): "draft" | "review" | "published" | "archived" {
  return status.toLowerCase() as "draft" | "review" | "published" | "archived";
}

function difficultyProp(difficulty: string): "easy" | "medium" | "hard" {
  return difficulty.toLowerCase() as "easy" | "medium" | "hard";
}

function localeLabel(code: string): string {
  const meta = LOCALES.find((l) => l.code === code);
  return meta ? `${meta.flag} ${meta.label}` : code;
}

/** Toolbar shared by the lesson and game tables. Bulk actions only render when a handler exists. */
function ContentToolbar({
  query,
  onQuery,
  status,
  onStatus,
  subject,
  onSubject,
  age,
  onAge,
  subjects,
  selectedCount,
  onBulk,
  bulkPending,
}: {
  query: string;
  onQuery: (v: string) => void;
  status: string;
  onStatus: (v: string) => void;
  subject: string;
  onSubject: (v: string) => void;
  age: string;
  onAge: (v: string) => void;
  subjects: SubjectDto[];
  selectedCount: number;
  onBulk?: (action: "publish" | "archive" | "delete") => void;
  bulkPending?: boolean;
}) {
  const t = useT();

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap gap-3">
        <div className="min-w-56 flex-1">
          <Input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={t("admin.searchContent")}
            aria-label={t("common.search")}
            leadingIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <Select aria-label={t("common.status")} value={status} onChange={(e) => onStatus(e.target.value)} className="sm:w-40">
          <option value="">{t("admin.allStatuses")}</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.key)}
            </option>
          ))}
        </Select>
        <Select aria-label={t("nav.subjects")} value={subject} onChange={(e) => onSubject(e.target.value)} className="sm:w-44">
          <option value="">{t("filter.allSubjects")}</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select aria-label={t("filter.age")} value={age} onChange={(e) => onAge(e.target.value)} className="sm:w-32">
          <option value="">{t("filter.allAges")}</option>
          {AGE_OPTIONS.map((band) => (
            <option key={band.value} value={band.value}>
              {t(band.key)}
            </option>
          ))}
        </Select>
      </div>

      {onBulk && selectedCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary-soft px-4 py-2.5">
          <p className="t-label text-primary">{t("admin.selected", { count: selectedCount })}</p>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={bulkPending}
              leadingIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
              onClick={() => onBulk("publish")}
            >
              {t("admin.publish")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={bulkPending}
              leadingIcon={<Archive className="h-3.5 w-3.5" />}
              onClick={() => onBulk("archive")}
            >
              {t("admin.archive")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-danger"
              disabled={bulkPending}
              leadingIcon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={() => onBulk("delete")}
            >
              {t("common.delete")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* --- Lessons ------------------------------------------------------------- */

export function LessonsAdminView() {
  const t = useT();
  const { intlLocale, locale, plural } = useI18n();
  const pushToast = useAppStore((s) => s.pushToast);
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [subject, setSubject] = useState("");
  const [age, setAge] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [editor, setEditor] = useState<{ open: boolean; lesson: LessonDto | null }>({ open: false, lesson: null });
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null);

  const search = useDebouncedValue(query, 300);

  const subjects = useQuery({
    queryKey: [...queryKeys.subjects, locale],
    queryFn: () => fetchSubjects(locale),
  });

  const lessons = useQuery({
    queryKey: [...queryKeys.lessons({ search, status, subject, age, page, purpose: "admin" }), locale],
    queryFn: () =>
      fetchLessons({
        search: search || undefined,
        status: status || undefined,
        subjectId: subject || undefined,
        ageCategory: age || undefined,
        page,
        limit: PAGE_SIZE,
        locale,
      }),
    placeholderData: (previous) => previous,
  });

  function invalidateLessons() {
    void queryClient.invalidateQueries({ queryKey: ["lessons"] });
  }

  function errorToast(error: unknown) {
    pushToast({
      title: t("state.errorTitle"),
      description: error instanceof ApiError ? error.message : undefined,
      tone: "coral",
      glyph: "⚠️",
    });
  }

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: string }) => changeLessonStatus(id, next),
    onSuccess: () => {
      pushToast({ title: t("admin.statusChanged"), tone: "mint", glyph: "✅" });
      invalidateLessons();
    },
    onError: errorToast,
  });

  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, next }: { ids: string[]; next: string }) =>
      Promise.all(ids.map((id) => changeLessonStatus(id, next))),
    onSuccess: () => {
      pushToast({ title: t("admin.statusChanged"), tone: "mint", glyph: "✅" });
      setSelected([]);
      invalidateLessons();
    },
    onError: errorToast,
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map((id) => deleteLesson(id))),
    onSuccess: () => {
      pushToast({ title: t("admin.lessonDeleted"), tone: "coral", glyph: "🗑️" });
      setSelected([]);
      setPendingDelete(null);
      invalidateLessons();
    },
    onError: (error) => {
      setPendingDelete(null);
      errorToast(error);
    },
  });

  const rows = lessons.data?.items ?? [];
  const total = lessons.data?.meta.total ?? 0;

  const columns: Array<Column<LessonDto>> = [
    {
      id: "title",
      header: t("admin.colTitle"),
      primary: true,
      sortValue: (row) => row.title,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-sm text-xl", toneStyles[toneOf(row.tone)].soft)} aria-hidden>
            {row.glyph}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-content">{row.title}</p>
            <p className="t-caption truncate text-content-secondary">{row.subject?.name ?? ""}</p>
          </div>
        </div>
      ),
    },
    {
      id: "age",
      header: t("filter.age"),
      width: "w-24",
      sortValue: (row) => row.ageCategory,
      cell: (row) => (
        <Badge tone="sky" size="sm">
          {t(AGE_KEY[row.ageCategory as keyof typeof AGE_KEY] ?? "age.band1_2")}
        </Badge>
      ),
    },
    {
      id: "difficulty",
      header: t("filter.difficulty"),
      width: "w-32",
      secondary: true,
      cell: (row) => (
        <DifficultyBadge
          difficulty={difficultyProp(row.difficulty)}
          label={t(DIFFICULTY_KEY[row.difficulty as keyof typeof DIFFICULTY_KEY] ?? "lesson.difficultyEasy")}
        />
      ),
    },
    {
      id: "status",
      header: t("common.status"),
      width: "w-40",
      sortValue: (row) => row.status,
      cell: (row) => (
        <Select
          aria-label={`${t("common.status")}: ${row.title}`}
          value={row.status}
          disabled={statusMutation.isPending}
          onChange={(e) => statusMutation.mutate({ id: row.id, next: e.target.value })}
          className="h-9 text-xs"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.key)}
            </option>
          ))}
        </Select>
      ),
    },
    {
      id: "completions",
      header: t("admin.colCompletions"),
      align: "right",
      secondary: true,
      sortValue: (row) => row.completions,
      cell: (row) => <span className="tabular-nums text-content-secondary">{formatCompact(row.completions, intlLocale)}</span>,
    },
    {
      id: "updated",
      header: t("admin.colUpdated"),
      secondary: true,
      sortValue: (row) => row.updatedAt,
      cell: (row) => <span className="t-caption text-content-secondary">{formatDate(row.updatedAt, intlLocale)}</span>,
    },
    {
      id: "actions",
      header: t("common.actions"),
      align: "right",
      width: "w-28",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <IconButton
            label={`${t("common.edit")} ${row.title}`}
            size="icon-sm"
            onClick={() => setEditor({ open: true, lesson: row })}
          >
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton
            label={`${t("common.delete")} ${row.title}`}
            size="icon-sm"
            className="text-danger"
            onClick={() => setPendingDelete([row.id])}
          >
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[100rem]">
      <PageHeading
        title={t("nav.lessons")}
        subtitle={plural("plural.lessons", total)}
        actions={
          <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setEditor({ open: true, lesson: null })}>
            {t("admin.newLesson")}
          </Button>
        }
      />

      <ContentToolbar
        query={query}
        onQuery={(v) => {
          setQuery(v);
          setPage(1);
        }}
        status={status}
        onStatus={(v) => {
          setStatus(v);
          setPage(1);
        }}
        subject={subject}
        onSubject={(v) => {
          setSubject(v);
          setPage(1);
        }}
        age={age}
        onAge={(v) => {
          setAge(v);
          setPage(1);
        }}
        subjects={subjects.data ?? []}
        selectedCount={selected.length}
        bulkPending={bulkStatusMutation.isPending || deleteMutation.isPending}
        onBulk={(action) => {
          if (action === "delete") setPendingDelete(selected);
          else bulkStatusMutation.mutate({ ids: selected, next: action === "publish" ? "PUBLISHED" : "ARCHIVED" });
        }}
      />

      {lessons.isLoading ? (
        <SkeletonTable rows={8} columns={6} />
      ) : lessons.isError ? (
        <ErrorState
          title={t("state.errorTitle")}
          body={t("state.errorBody")}
          action={<Button onClick={() => void lessons.refetch()}>{t("common.retry")}</Button>}
        />
      ) : (
        <>
          <DataTable
            rows={rows}
            columns={columns}
            getRowId={(row) => row.id}
            selectable
            selectedIds={selected}
            onSelectionChange={setSelected}
            pageSize={PAGE_SIZE}
            caption={t("nav.lessons")}
            emptyState={
              <EmptyState
                glyph="📚"
                title={t("state.noLessonsTitle")}
                body={t("state.noLessonsBody")}
                action={
                  <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setEditor({ open: true, lesson: null })}>
                    {t("admin.newLesson")}
                  </Button>
                }
              />
            }
          />
          {(lessons.data?.meta.totalPages ?? 1) > 1 ? (
            <Pagination
              className="mt-4"
              page={page}
              totalPages={lessons.data?.meta.totalPages ?? 1}
              totalItems={total}
              onChange={(next) => {
                setPage(next);
                setSelected([]);
              }}
            />
          ) : null}
        </>
      )}

      <LessonEditor
        open={editor.open}
        lesson={editor.lesson}
        subjects={subjects.data ?? []}
        onClose={() => setEditor({ open: false, lesson: null })}
      />

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title={
          pendingDelete && pendingDelete.length > 1
            ? t("admin.deleteSelectedTitle", { count: pendingDelete.length })
            : t("admin.deleteLessonTitle")
        }
        description={t("admin.deleteLessonBody")}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete)}
            >
              {t("common.delete")}
            </Button>
          </>
        }
      >
        <span />
      </Modal>
    </div>
  );
}

interface LessonFormState {
  subjectId: string;
  ageCategory: string;
  difficulty: string;
  durationMinutes: number;
  xpReward: number;
  starReward: number;
  glyph: string;
  tone: string;
  translations: Record<EditorLocale, { title: string; description: string }>;
}

const EMPTY_TRANSLATIONS: LessonFormState["translations"] = {
  en: { title: "", description: "" },
  ru: { title: "", description: "" },
  uz: { title: "", description: "" },
};

/**
 * Create/edit dialog for a lesson. Editing prefetches the lesson once per
 * locale so all three translations round-trip intact — the API replaces the
 * full translation set on save. The keyed inner form initialises its state on
 * mount; the Modal unmounts it on close, so state can never leak between rows.
 */
function LessonEditor({
  open,
  lesson,
  subjects,
  onClose,
}: {
  open: boolean;
  lesson: LessonDto | null;
  subjects: SubjectDto[];
  onClose: () => void;
}) {
  const t = useT();

  const translations = useQuery({
    queryKey: ["lessons", lesson?.id ?? "new", "editor-translations"],
    enabled: open && Boolean(lesson),
    queryFn: async () => {
      const perLocale = await Promise.all(EDITOR_LOCALES.map((code) => fetchLesson(lesson!.id, undefined, code)));
      return Object.fromEntries(
        EDITOR_LOCALES.map((code, index) => [
          code,
          { title: perLocale[index].title, description: perLocale[index].description },
        ]),
      ) as LessonFormState["translations"];
    },
  });

  const initial: LessonFormState | null = !open
    ? null
    : lesson
      ? translations.data
        ? {
            subjectId: lesson.subjectId,
            ageCategory: lesson.ageCategory,
            difficulty: lesson.difficulty,
            durationMinutes: lesson.durationMinutes,
            xpReward: lesson.xpReward,
            starReward: lesson.starReward,
            glyph: lesson.glyph,
            tone: lesson.tone,
            translations: translations.data,
          }
        : null
      : {
          subjectId: subjects[0]?.id ?? "",
          ageCategory: "AGE_3_4",
          difficulty: "EASY",
          durationMinutes: 5,
          xpReward: 20,
          starReward: 5,
          glyph: "📘",
          tone: "sky",
          translations: EMPTY_TRANSLATIONS,
        };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={lesson ? `${t("admin.editLesson")}: ${lesson.title}` : t("admin.newLesson")}
      description={t("admin.lessonEditorHint")}
      size="lg"
    >
      {initial ? (
        <LessonEditorForm
          key={lesson?.id ?? `new-${subjects[0]?.id ?? ""}`}
          initial={initial}
          lessonId={lesson?.id}
          subjects={subjects}
          onClose={onClose}
        />
      ) : (
        <div className="space-y-4">
          <div className="shimmer h-11 rounded-sm" />
          <div className="shimmer h-11 rounded-sm" />
          <div className="shimmer h-24 rounded-sm" />
        </div>
      )}
    </Modal>
  );
}

function LessonEditorForm({
  initial,
  lessonId,
  subjects,
  onClose,
}: {
  initial: LessonFormState;
  lessonId?: string;
  subjects: SubjectDto[];
  onClose: () => void;
}) {
  const t = useT();
  const pushToast = useAppStore((s) => s.pushToast);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<LessonFormState>(initial);
  const [titleError, setTitleError] = useState(false);

  const save = useMutation({
    mutationFn: (state: LessonFormState) =>
      upsertLesson(
        {
          subjectId: state.subjectId,
          ageCategory: state.ageCategory,
          difficulty: state.difficulty,
          durationMinutes: state.durationMinutes,
          xpReward: state.xpReward,
          starReward: state.starReward,
          glyph: state.glyph,
          tone: state.tone,
          translations: EDITOR_LOCALES.filter((code) => state.translations[code].title.trim().length > 0).map((code) => ({
            locale: code,
            title: state.translations[code].title.trim(),
            description: state.translations[code].description.trim() || undefined,
          })),
        },
        lessonId,
      ),
    onSuccess: () => {
      pushToast({ title: t("admin.lessonSaved"), tone: "mint", glyph: "✅" });
      void queryClient.invalidateQueries({ queryKey: ["lessons"] });
      onClose();
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

  function submit() {
    if (form.translations.en.title.trim().length === 0 || form.subjectId === "") {
      setTitleError(true);
      return;
    }
    setTitleError(false);
    save.mutate(form);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-surface-muted p-4">
        <p className="t-label mb-3 text-content">{t("admin.translations")}</p>
        <div className="space-y-4">
          {EDITOR_LOCALES.map((code) => (
            <div key={code} className="grid gap-3 sm:grid-cols-2">
              <Field
                label={`${localeLabel(code)} — ${t("admin.fieldTitle")}`}
                required={code === "en"}
                error={code === "en" && titleError && form.translations.en.title.trim().length === 0 ? t("admin.titleRequired") : undefined}
              >
                {({ id, invalid }) => (
                  <Input
                    id={id}
                    invalid={invalid}
                    value={form.translations[code].title}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        translations: {
                          ...form.translations,
                          [code]: { ...form.translations[code], title: e.target.value },
                        },
                      })
                    }
                  />
                )}
              </Field>
              <Field label={`${localeLabel(code)} — ${t("admin.fieldDescription")}`}>
                {({ id }) => (
                  <Textarea
                    id={id}
                    rows={1}
                    value={form.translations[code].description}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        translations: {
                          ...form.translations,
                          [code]: { ...form.translations[code], description: e.target.value },
                        },
                      })
                    }
                  />
                )}
              </Field>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("admin.colSubject")}>
          {({ id }) => (
            <Select id={id} value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.glyph} {s.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t("filter.age")}>
          {({ id }) => (
            <Select id={id} value={form.ageCategory} onChange={(e) => setForm({ ...form, ageCategory: e.target.value })}>
              {AGE_OPTIONS.map((band) => (
                <option key={band.value} value={band.value}>
                  {t(band.key)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t("filter.difficulty")}>
          {({ id }) => (
            <Select id={id} value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
              {DIFFICULTY_OPTIONS.map((level) => (
                <option key={level.value} value={level.value}>
                  {t(level.key)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t("admin.fieldDuration")}>
          {({ id }) => (
            <Input
              id={id}
              type="number"
              min={1}
              max={90}
              value={form.durationMinutes}
              onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
            />
          )}
        </Field>
        <Field label={t("admin.fieldXp")}>
          {({ id }) => (
            <Input
              id={id}
              type="number"
              min={0}
              max={500}
              value={form.xpReward}
              onChange={(e) => setForm({ ...form, xpReward: Number(e.target.value) })}
            />
          )}
        </Field>
        <Field label={t("admin.fieldStars")}>
          {({ id }) => (
            <Input
              id={id}
              type="number"
              min={0}
              max={50}
              value={form.starReward}
              onChange={(e) => setForm({ ...form, starReward: Number(e.target.value) })}
            />
          )}
        </Field>
        <Field label={t("admin.fieldGlyph")}>
          {({ id }) => <Input id={id} value={form.glyph} onChange={(e) => setForm({ ...form, glyph: e.target.value })} />}
        </Field>
        <Field label={t("admin.fieldTone")}>
          {({ id }) => (
            <Select id={id} value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })}>
              {TONES.map((toneOption) => (
                <option key={toneOption} value={toneOption}>
                  {toneOption}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <Button variant="ghost" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button onClick={submit} loading={save.isPending}>
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}

/* --- Games --------------------------------------------------------------- */

type GameRow = Awaited<ReturnType<typeof fetchGames>>["items"][number];

export function GamesAdminView() {
  const t = useT();
  const { intlLocale, locale, plural } = useI18n();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [subject, setSubject] = useState("");
  const [age, setAge] = useState("");
  const [page, setPage] = useState(1);

  const search = useDebouncedValue(query, 300);

  const subjects = useQuery({
    queryKey: [...queryKeys.subjects, locale],
    queryFn: () => fetchSubjects(locale),
  });

  const games = useQuery({
    queryKey: [...queryKeys.games({ search, status, subject, age, page, purpose: "admin" }), locale],
    queryFn: () =>
      fetchGames({
        search: search || undefined,
        status: status || undefined,
        subjectId: subject || undefined,
        ageCategory: age || undefined,
        page,
        limit: PAGE_SIZE,
        locale,
      }),
    placeholderData: (previous) => previous,
  });

  const rows = games.data?.items ?? [];
  const total = games.data?.meta.total ?? 0;

  const columns: Array<Column<GameRow>> = [
    {
      id: "title",
      header: t("admin.colGame"),
      primary: true,
      sortValue: (row) => row.title,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-sm text-xl", toneStyles[toneOf(row.tone)].soft)} aria-hidden>
            {row.glyph}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-content">{row.title}</p>
            <p className="t-caption truncate text-content-secondary">{row.type}</p>
          </div>
        </div>
      ),
    },
    { id: "subject", header: t("admin.colSubject"), secondary: true, cell: (row) => row.subject?.name ?? "" },
    {
      id: "age",
      header: t("filter.age"),
      width: "w-24",
      cell: (row) => (
        <Badge tone="sky" size="sm">
          {t(AGE_KEY[row.ageCategory as keyof typeof AGE_KEY] ?? "age.band1_2")}
        </Badge>
      ),
    },
    {
      id: "difficulty",
      header: t("filter.difficulty"),
      secondary: true,
      cell: (row) => (
        <DifficultyBadge
          difficulty={difficultyProp(row.difficulty)}
          label={t(DIFFICULTY_KEY[row.difficulty as keyof typeof DIFFICULTY_KEY] ?? "lesson.difficultyEasy")}
        />
      ),
    },
    {
      id: "status",
      header: t("common.status"),
      width: "w-32",
      cell: (row) => <StatusBadge status={statusProp(row.status)} />,
    },
    {
      id: "plays",
      header: t("game.plays"),
      align: "right",
      sortValue: (row) => row.plays,
      cell: (row) => <span className="tabular-nums text-content-secondary">{formatCompact(row.plays, intlLocale)}</span>,
    },
    {
      id: "completion",
      header: t("game.completion"),
      align: "right",
      sortValue: (row) => row.completionRate,
      cell: (row) => (
        <span className="inline-flex items-center gap-2">
          <span className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-surface-muted lg:block">
            <span className="block h-full rounded-full bg-mint-core" style={{ width: `${row.completionRate}%` }} />
          </span>
          <span className="font-semibold tabular-nums text-content">{row.completionRate}%</span>
        </span>
      ),
    },
    {
      id: "updated",
      header: t("admin.colUpdated"),
      secondary: true,
      sortValue: (row) => row.updatedAt,
      cell: (row) => <span className="t-caption text-content-secondary">{formatDate(row.updatedAt, intlLocale)}</span>,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[100rem]">
      <PageHeading title={t("nav.games")} subtitle={plural("plural.games", total)} />

      <div role="note" className="mb-4 flex items-start gap-3 rounded-xl border border-info/30 bg-info-soft px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden />
        <p className="t-body-sm text-content">{t("admin.gamesReadOnly")}</p>
      </div>

      <ContentToolbar
        query={query}
        onQuery={(v) => {
          setQuery(v);
          setPage(1);
        }}
        status={status}
        onStatus={(v) => {
          setStatus(v);
          setPage(1);
        }}
        subject={subject}
        onSubject={(v) => {
          setSubject(v);
          setPage(1);
        }}
        age={age}
        onAge={(v) => {
          setAge(v);
          setPage(1);
        }}
        subjects={subjects.data ?? []}
        selectedCount={0}
      />

      {games.isLoading ? (
        <SkeletonTable rows={6} columns={7} />
      ) : games.isError ? (
        <ErrorState
          title={t("state.errorTitle")}
          body={t("state.errorBody")}
          action={<Button onClick={() => void games.refetch()}>{t("common.retry")}</Button>}
        />
      ) : (
        <>
          <DataTable
            rows={rows}
            columns={columns}
            getRowId={(row) => row.id}
            pageSize={PAGE_SIZE}
            caption={t("nav.games")}
            emptyState={<EmptyState glyph="🎮" title={t("state.noResultsTitle")} body={t("state.noResultsBody")} />}
          />
          {(games.data?.meta.totalPages ?? 1) > 1 ? (
            <Pagination
              className="mt-4"
              page={page}
              totalPages={games.data?.meta.totalPages ?? 1}
              totalItems={total}
              onChange={setPage}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

/* --- Subjects & categories ----------------------------------------------- */

interface SubjectFormState {
  slug: string;
  glyph: string;
  tone: string;
  order: number;
  translations: Record<EditorLocale, { title: string; description: string }>;
}

export function SubjectsAdminView() {
  const t = useT();
  const { locale, plural } = useI18n();
  const [editor, setEditor] = useState<{ open: boolean; slug: string | null }>({ open: false, slug: null });

  const subjects = useQuery({
    queryKey: [...queryKeys.subjects, locale],
    queryFn: () => fetchSubjects(locale),
  });

  /** All three locales at once, so editing round-trips every translation. */
  const allLocales = useQuery({
    queryKey: [...queryKeys.subjects, "editor-locales"],
    enabled: editor.open,
    queryFn: async () => {
      const [en, ru, uz] = await Promise.all(EDITOR_LOCALES.map((code) => fetchSubjects(code)));
      return { en, ru, uz };
    },
  });

  const initial: SubjectFormState | null = !editor.open
    ? null
    : editor.slug
      ? allLocales.data
        ? (() => {
            const base = allLocales.data.en.find((s) => s.slug === editor.slug);
            if (!base) return null;
            return {
              slug: base.slug,
              glyph: base.glyph,
              tone: base.tone,
              order: base.order,
              translations: Object.fromEntries(
                EDITOR_LOCALES.map((code) => {
                  const match = allLocales.data[code].find((s) => s.slug === editor.slug);
                  return [code, { title: match?.name ?? "", description: match?.description ?? "" }];
                }),
              ) as SubjectFormState["translations"],
            };
          })()
        : null
      : { slug: "", glyph: "📘", tone: "sky", order: 0, translations: EMPTY_TRANSLATIONS };

  return (
    <div className="mx-auto w-full max-w-[90rem]">
      <PageHeading
        title={t("nav.subjects")}
        subtitle={t("admin.subjectsSubtitle")}
        actions={
          <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setEditor({ open: true, slug: null })}>
            {t("admin.newSubject")}
          </Button>
        }
      />

      {subjects.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="shimmer h-44 rounded-xl" />
          ))}
        </div>
      ) : subjects.isError ? (
        <ErrorState
          title={t("state.errorTitle")}
          body={t("state.errorBody")}
          action={<Button onClick={() => void subjects.refetch()}>{t("common.retry")}</Button>}
        />
      ) : (subjects.data?.length ?? 0) === 0 ? (
        <EmptyState glyph="🎨" title={t("state.emptyTitle")} body={t("state.emptyBody")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {(subjects.data ?? []).map((subject) => (
            <Card key={subject.id} interactive>
              <CardBody className="pt-5">
                <div className="flex items-start gap-3">
                  <span
                    className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-lg text-3xl", toneStyles[toneOf(subject.tone)].soft)}
                    aria-hidden
                  >
                    {subject.glyph}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="t-h4 truncate text-content">{subject.name}</h3>
                    <p className="t-caption text-content-secondary">{plural("plural.lessons", subject.lessonCount)}</p>
                  </div>
                  <IconButton
                    label={`${t("common.edit")} ${subject.name}`}
                    size="icon-sm"
                    onClick={() => setEditor({ open: true, slug: subject.slug })}
                  >
                    <Pencil className="h-4 w-4" />
                  </IconButton>
                </div>
                <p className="t-caption mt-3 text-content-secondary">{subject.description}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className={cn("h-3 w-3 rounded-full", toneStyles[toneOf(subject.tone)].solid)} aria-hidden />
                  <span className="t-caption font-semibold text-content-secondary">
                    {t("admin.tone")}: {subject.tone}
                  </span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={editor.open}
        onClose={() => setEditor({ open: false, slug: null })}
        title={editor.slug ? t("admin.editSubject") : t("admin.newSubject")}
        size="lg"
      >
        {initial ? (
          <SubjectEditorForm
            key={editor.slug ?? "new"}
            initial={initial}
            isEdit={Boolean(editor.slug)}
            onClose={() => setEditor({ open: false, slug: null })}
          />
        ) : (
          <div className="space-y-4">
            <div className="shimmer h-11 rounded-sm" />
            <div className="shimmer h-11 rounded-sm" />
            <div className="shimmer h-24 rounded-sm" />
          </div>
        )}
      </Modal>
    </div>
  );
}

function SubjectEditorForm({
  initial,
  isEdit,
  onClose,
}: {
  initial: SubjectFormState;
  isEdit: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const pushToast = useAppStore((s) => s.pushToast);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SubjectFormState>(initial);
  const [formError, setFormError] = useState(false);

  const save = useMutation({
    mutationFn: (state: SubjectFormState) =>
      upsertSubject({
        slug: state.slug.trim(),
        glyph: state.glyph,
        tone: state.tone,
        order: state.order,
        translations: EDITOR_LOCALES.filter((code) => state.translations[code].title.trim().length > 0).map((code) => ({
          locale: code,
          title: state.translations[code].title.trim(),
          description: state.translations[code].description.trim() || undefined,
        })),
      }),
    onSuccess: () => {
      pushToast({ title: t("admin.subjectSaved"), tone: "mint", glyph: "✅" });
      void queryClient.invalidateQueries({ queryKey: ["subjects"] });
      onClose();
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

  function submit() {
    if (form.slug.trim().length === 0 || form.translations.en.title.trim().length === 0) {
      setFormError(true);
      return;
    }
    setFormError(false);
    save.mutate(form);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("admin.fieldSlug")}
          required
          hint={isEdit ? t("admin.slugLockedHint") : undefined}
          error={formError && form.slug.trim().length === 0 ? t("common.required") : undefined}
        >
          {({ id, invalid }) => (
            <Input
              id={id}
              invalid={invalid}
              value={form.slug}
              disabled={isEdit}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
          )}
        </Field>
        <Field label={t("admin.fieldGlyph")}>
          {({ id }) => <Input id={id} value={form.glyph} onChange={(e) => setForm({ ...form, glyph: e.target.value })} />}
        </Field>
        <Field label={t("admin.fieldTone")}>
          {({ id }) => (
            <Select id={id} value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })}>
              {TONES.map((toneOption) => (
                <option key={toneOption} value={toneOption}>
                  {toneOption}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t("admin.fieldOrder")}>
          {({ id }) => (
            <Input
              id={id}
              type="number"
              min={0}
              value={form.order}
              onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
            />
          )}
        </Field>
      </div>

      <div className="rounded-lg border border-border bg-surface-muted p-4">
        <p className="t-label mb-3 text-content">{t("admin.translations")}</p>
        <div className="space-y-4">
          {EDITOR_LOCALES.map((code) => (
            <div key={code} className="grid gap-3 sm:grid-cols-2">
              <Field
                label={`${localeLabel(code)} — ${t("admin.fieldTitle")}`}
                required={code === "en"}
                error={code === "en" && formError && form.translations.en.title.trim().length === 0 ? t("admin.titleRequired") : undefined}
              >
                {({ id, invalid }) => (
                  <Input
                    id={id}
                    invalid={invalid}
                    value={form.translations[code].title}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        translations: {
                          ...form.translations,
                          [code]: { ...form.translations[code], title: e.target.value },
                        },
                      })
                    }
                  />
                )}
              </Field>
              <Field label={`${localeLabel(code)} — ${t("admin.fieldDescription")}`}>
                {({ id }) => (
                  <Textarea
                    id={id}
                    rows={1}
                    value={form.translations[code].description}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        translations: {
                          ...form.translations,
                          [code]: { ...form.translations[code], description: e.target.value },
                        },
                      })
                    }
                  />
                )}
              </Field>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <Button variant="ghost" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button onClick={submit} loading={save.isPending}>
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}

type CategoryRow = Awaited<ReturnType<typeof fetchCategories>>["items"][number];

interface CategoryFormState {
  slug: string;
  subjectId: string;
  status: string;
  translations: Record<EditorLocale, string>;
}

export function CategoriesAdminView() {
  const t = useT();
  const { intlLocale, locale } = useI18n();
  const [page, setPage] = useState(1);
  const [creatorOpen, setCreatorOpen] = useState(false);

  const subjects = useQuery({
    queryKey: [...queryKeys.subjects, locale],
    queryFn: () => fetchSubjects(locale),
  });

  const categories = useQuery({
    queryKey: queryKeys.categories({ page }),
    queryFn: () => fetchCategories({ page, limit: PAGE_SIZE }),
    placeholderData: (previous) => previous,
  });

  const rows = categories.data?.items ?? [];

  const columns: Array<Column<CategoryRow>> = [
    {
      id: "name",
      header: t("admin.colCategory"),
      primary: true,
      sortValue: (row) => row.name,
      cell: (row) => <span className="font-semibold text-content">{row.name}</span>,
    },
    {
      id: "subject",
      header: t("admin.colSubject"),
      cell: (row) => {
        const subject = (subjects.data ?? []).find((s) => s.id === row.subjectId);
        return subject ? (
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", toneStyles[toneOf(subject.tone)].solid)} aria-hidden />
            {subject.name}
          </span>
        ) : null;
      },
    },
    {
      id: "items",
      header: t("admin.colItems"),
      align: "right",
      sortValue: (row) => row.itemCount,
      cell: (row) => <span className="tabular-nums">{row.itemCount}</span>,
    },
    { id: "status", header: t("common.status"), cell: (row) => <StatusBadge status={statusProp(row.status)} /> },
    {
      id: "updated",
      header: t("admin.colUpdated"),
      secondary: true,
      sortValue: (row) => row.updatedAt,
      cell: (row) => <span className="t-caption text-content-secondary">{formatDate(row.updatedAt, intlLocale)}</span>,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[90rem]">
      <PageHeading
        title={t("nav.categories")}
        subtitle={t("admin.categoriesSubtitle")}
        actions={
          <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setCreatorOpen(true)}>
            {t("admin.newCategory")}
          </Button>
        }
      />

      {categories.isLoading ? (
        <SkeletonTable rows={6} columns={5} />
      ) : categories.isError ? (
        <ErrorState
          title={t("state.errorTitle")}
          body={t("state.errorBody")}
          action={<Button onClick={() => void categories.refetch()}>{t("common.retry")}</Button>}
        />
      ) : (
        <>
          <DataTable
            rows={rows}
            columns={columns}
            getRowId={(row) => row.id}
            pageSize={PAGE_SIZE}
            caption={t("nav.categories")}
            emptyState={<EmptyState glyph="🗂️" title={t("state.emptyTitle")} body={t("state.emptyBody")} />}
          />
          {(categories.data?.meta.totalPages ?? 1) > 1 ? (
            <Pagination
              className="mt-4"
              page={page}
              totalPages={categories.data?.meta.totalPages ?? 1}
              totalItems={categories.data?.meta.total}
              onChange={setPage}
            />
          ) : null}
        </>
      )}

      <Modal open={creatorOpen} onClose={() => setCreatorOpen(false)} title={t("admin.newCategory")} size="md">
        <CategoryCreatorForm
          key={`new-${subjects.data?.[0]?.id ?? ""}`}
          subjects={subjects.data ?? []}
          onClose={() => setCreatorOpen(false)}
        />
      </Modal>
    </div>
  );
}

function CategoryCreatorForm({ subjects, onClose }: { subjects: SubjectDto[]; onClose: () => void }) {
  const t = useT();
  const pushToast = useAppStore((s) => s.pushToast);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CategoryFormState>({
    slug: "",
    subjectId: subjects[0]?.id ?? "",
    status: "DRAFT",
    translations: { en: "", ru: "", uz: "" },
  });
  const [formError, setFormError] = useState(false);

  const save = useMutation({
    mutationFn: (state: CategoryFormState) =>
      upsertCategory({
        slug: state.slug.trim(),
        subjectId: state.subjectId,
        status: state.status,
        translations: EDITOR_LOCALES.filter((code) => state.translations[code].trim().length > 0).map((code) => ({
          locale: code,
          title: state.translations[code].trim(),
        })),
      }),
    onSuccess: () => {
      pushToast({ title: t("admin.categorySaved"), tone: "mint", glyph: "✅" });
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
      onClose();
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

  function submit() {
    if (form.slug.trim().length === 0 || form.subjectId === "" || form.translations.en.trim().length === 0) {
      setFormError(true);
      return;
    }
    setFormError(false);
    save.mutate(form);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("admin.fieldSlug")}
          required
          error={formError && form.slug.trim().length === 0 ? t("common.required") : undefined}
        >
          {({ id, invalid }) => (
            <Input id={id} invalid={invalid} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          )}
        </Field>
        <Field label={t("admin.colSubject")}>
          {({ id }) => (
            <Select id={id} value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.glyph} {s.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t("common.status")} className="sm:col-span-2">
          {({ id }) => (
            <Select id={id} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.key)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div className="rounded-lg border border-border bg-surface-muted p-4">
        <p className="t-label mb-3 text-content">{t("admin.translations")}</p>
        <div className="space-y-3">
          {EDITOR_LOCALES.map((code) => (
            <Field
              key={code}
              label={`${localeLabel(code)} — ${t("admin.fieldTitle")}`}
              required={code === "en"}
              error={code === "en" && formError && form.translations.en.trim().length === 0 ? t("admin.titleRequired") : undefined}
            >
              {({ id, invalid }) => (
                <Input
                  id={id}
                  invalid={invalid}
                  value={form.translations[code]}
                  onChange={(e) => setForm({ ...form, translations: { ...form.translations, [code]: e.target.value } })}
                />
              )}
            </Field>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <Button variant="ghost" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button onClick={submit} loading={save.isPending}>
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
