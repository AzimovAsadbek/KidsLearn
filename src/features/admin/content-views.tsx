"use client";

import { useMemo, useState } from "react";
import { Archive, CheckCircle2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { cn, formatCompact, formatDate } from "@/lib/utils";
import { toneStyles } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import type { ContentStatus, Lesson } from "@/types";
import { lessons } from "@/data/lessons";
import { games } from "@/data/games";
import { categories, subjects } from "@/data/subjects";
import { useAppStore } from "@/store/app-store";
import { PageHeading } from "@/components/layout/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button, IconButton } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Badge, DifficultyBadge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { Modal } from "@/components/ui/overlay";

const STATUSES: ContentStatus[] = ["draft", "review", "published", "archived"];

const DIFFICULTY_KEY = {
  easy: "lesson.difficultyEasy",
  medium: "lesson.difficultyMedium",
  hard: "lesson.difficultyHard",
} as const;

/** Toolbar shared by the lesson and game tables. */
function ContentToolbar({
  query,
  onQuery,
  status,
  onStatus,
  subject,
  onSubject,
  age,
  onAge,
  selectedCount,
  onBulk,
}: {
  query: string;
  onQuery: (v: string) => void;
  status: string;
  onStatus: (v: string) => void;
  subject: string;
  onSubject: (v: string) => void;
  age: string;
  onAge: (v: string) => void;
  selectedCount: number;
  onBulk: (action: "publish" | "archive" | "delete") => void;
}) {
  const t = useT();

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap gap-3">
        <div className="min-w-56 flex-1">
          <Input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search by name…"
            aria-label={t("common.search")}
            leadingIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <Select aria-label={t("common.status")} value={status} onChange={(e) => onStatus(e.target.value)} className="sm:w-40">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </Select>
        <Select aria-label={t("nav.subjects")} value={subject} onChange={(e) => onSubject(e.target.value)} className="sm:w-44">
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select aria-label="Age band" value={age} onChange={(e) => onAge(e.target.value)} className="sm:w-32">
          <option value="">All ages</option>
          {["1-2", "2-3", "3-4", "4-5", "5-6", "6-7"].map((band) => (
            <option key={band} value={band}>
              {band}
            </option>
          ))}
        </Select>
      </div>

      {selectedCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary-soft px-4 py-2.5">
          <p className="t-label text-primary">{t("admin.selected", { count: selectedCount })}</p>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" leadingIcon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => onBulk("publish")}>
              Publish
            </Button>
            <Button size="sm" variant="secondary" leadingIcon={<Archive className="h-3.5 w-3.5" />} onClick={() => onBulk("archive")}>
              Archive
            </Button>
            <Button size="sm" variant="ghost" className="text-danger" leadingIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => onBulk("delete")}>
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
  const { intlLocale } = useI18n();
  const pushToast = useAppStore((s) => s.pushToast);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [subject, setSubject] = useState("");
  const [age, setAge] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<Lesson | null>(null);

  const rows = useMemo(
    () =>
      lessons.filter((lesson) => {
        if (query && !lesson.title.toLowerCase().includes(query.toLowerCase())) return false;
        if (status && lesson.status !== status) return false;
        if (subject && lesson.subjectId !== subject) return false;
        if (age && lesson.ageBand !== age) return false;
        return true;
      }),
    [query, status, subject, age],
  );

  const columns: Array<Column<Lesson>> = [
    {
      id: "title",
      header: "Title",
      primary: true,
      sortValue: (row) => row.title,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-sm text-xl", toneStyles[row.tone].soft)} aria-hidden>
            {row.glyph}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-content">{row.title}</p>
            <p className="t-caption truncate text-content-secondary">{subjects.find((s) => s.id === row.subjectId)?.name}</p>
          </div>
        </div>
      ),
    },
    { id: "age", header: "Age", width: "w-24", sortValue: (row) => row.ageBand, cell: (row) => <Badge tone="sky" size="sm">{row.ageBand}</Badge> },
    {
      id: "difficulty",
      header: "Level",
      width: "w-32",
      secondary: true,
      cell: (row) => <DifficultyBadge difficulty={row.difficulty} label={t(DIFFICULTY_KEY[row.difficulty])} />,
    },
    { id: "status", header: t("common.status"), width: "w-32", sortValue: (row) => row.status, cell: (row) => <StatusBadge status={row.status} /> },
    {
      id: "completions",
      header: "Completions",
      align: "right",
      secondary: true,
      sortValue: (row) => row.completions,
      cell: (row) => <span className="tabular-nums text-content-secondary">{formatCompact(row.completions)}</span>,
    },
    {
      id: "updated",
      header: "Updated",
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
          <IconButton label={`${t("common.edit")} ${row.title}`} size="icon-sm" onClick={() => setEditing(row)}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton
            label={`${t("common.delete")} ${row.title}`}
            size="icon-sm"
            className="text-danger"
            onClick={() => pushToast({ title: "Deletion requires confirmation", tone: "coral", glyph: "⚠️" })}
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
        subtitle={`${lessons.length} lessons · ${lessons.filter((l) => l.status === "published").length} published`}
        actions={<Button leadingIcon={<Plus className="h-4 w-4" />}>{t("admin.newLesson")}</Button>}
      />

      <ContentToolbar
        query={query}
        onQuery={setQuery}
        status={status}
        onStatus={setStatus}
        subject={subject}
        onSubject={setSubject}
        age={age}
        onAge={setAge}
        selectedCount={selected.length}
        onBulk={(action) => {
          pushToast({ title: `${selected.length} lessons — ${action}`, tone: "brand", glyph: "📚" });
          setSelected([]);
        }}
      />

      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        caption="Lessons"
        emptyState={
          <EmptyState
            glyph="📚"
            title={t("state.noLessonsTitle")}
            body={t("state.noLessonsBody")}
            action={<Button leadingIcon={<Plus className="h-4 w-4" />}>{t("admin.newLesson")}</Button>}
          />
        }
      />

      <LessonEditor lesson={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function LessonEditor({ lesson, onClose }: { lesson: Lesson | null; onClose: () => void }) {
  const t = useT();
  const pushToast = useAppStore((s) => s.pushToast);

  return (
    <Modal
      open={Boolean(lesson)}
      onClose={onClose}
      title={lesson ? `Edit: ${lesson.title}` : ""}
      description="Changes go to review before publishing."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => {
              pushToast({ title: "Lesson saved", description: "Moved to review.", tone: "mint", glyph: "✅" });
              onClose();
            }}
          >
            {t("common.save")}
          </Button>
        </>
      }
    >
      {lesson ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="t-label mb-1.5 block text-content">Title</span>
              <Input defaultValue={lesson.title} />
            </label>
            <label className="block">
              <span className="t-label mb-1.5 block text-content">Subject</span>
              <Select defaultValue={lesson.subjectId}>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="t-label mb-1.5 block text-content">Age band</span>
              <Select defaultValue={lesson.ageBand}>
                {["1-2", "2-3", "3-4", "4-5", "5-6", "6-7"].map((band) => (
                  <option key={band} value={band}>
                    {band}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="t-label mb-1.5 block text-content">{t("common.status")}</span>
              <Select defaultValue={lesson.status}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          <div className="rounded-lg border border-border bg-surface-muted p-4">
            <p className="t-label text-content">Steps ({lesson.steps.length})</p>
            <ol className="mt-2 space-y-1.5">
              {lesson.steps.map((step, index) => (
                <li key={step.id} className="t-caption flex items-center gap-2 text-content-secondary">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-surface font-bold">
                    {index + 1}
                  </span>
                  <span className="font-semibold uppercase tracking-wide text-content-tertiary">{step.kind}</span>
                  <span className="truncate">{step.title}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

/* --- Games --------------------------------------------------------------- */

type GameRow = (typeof games)[number];

export function GamesAdminView() {
  const t = useT();
  const { intlLocale } = useI18n();
  const pushToast = useAppStore((s) => s.pushToast);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [subject, setSubject] = useState("");
  const [age, setAge] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const rows = useMemo(
    () =>
      games.filter((game) => {
        if (query && !game.title.toLowerCase().includes(query.toLowerCase())) return false;
        if (status && game.status !== status) return false;
        if (subject && game.subjectId !== subject) return false;
        if (age && game.ageBand !== age) return false;
        return true;
      }),
    [query, status, subject, age],
  );

  const columns: Array<Column<GameRow>> = [
    {
      id: "title",
      header: "Game",
      primary: true,
      sortValue: (row) => row.title,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-sm text-xl", toneStyles[row.tone].soft)} aria-hidden>
            {row.glyph}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-content">{row.title}</p>
            <p className="t-caption truncate text-content-secondary">{row.type}</p>
          </div>
        </div>
      ),
    },
    { id: "subject", header: "Subject", secondary: true, cell: (row) => subjects.find((s) => s.id === row.subjectId)?.name },
    { id: "age", header: "Age", width: "w-24", cell: (row) => <Badge tone="sky" size="sm">{row.ageBand}</Badge> },
    {
      id: "difficulty",
      header: "Level",
      secondary: true,
      cell: (row) => <DifficultyBadge difficulty={row.difficulty} label={t(DIFFICULTY_KEY[row.difficulty])} />,
    },
    { id: "status", header: t("common.status"), width: "w-32", cell: (row) => <StatusBadge status={row.status} /> },
    {
      id: "plays",
      header: "Plays",
      align: "right",
      sortValue: (row) => row.plays,
      cell: (row) => <span className="tabular-nums text-content-secondary">{formatCompact(row.plays)}</span>,
    },
    {
      id: "completion",
      header: "Completion",
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
      header: "Updated",
      secondary: true,
      sortValue: (row) => row.updatedAt,
      cell: (row) => <span className="t-caption text-content-secondary">{formatDate(row.updatedAt, intlLocale)}</span>,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[100rem]">
      <PageHeading
        title={t("nav.games")}
        subtitle={`${games.length} game engines across ${subjects.length} subjects`}
        actions={<Button leadingIcon={<Plus className="h-4 w-4" />}>{t("admin.newGame")}</Button>}
      />

      <ContentToolbar
        query={query}
        onQuery={setQuery}
        status={status}
        onStatus={setStatus}
        subject={subject}
        onSubject={setSubject}
        age={age}
        onAge={setAge}
        selectedCount={selected.length}
        onBulk={(action) => {
          pushToast({ title: `${selected.length} games — ${action}`, tone: "brand", glyph: "🎮" });
          setSelected([]);
        }}
      />

      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        caption="Games"
        emptyState={<EmptyState glyph="🎮" title={t("state.noResultsTitle")} body={t("state.noResultsBody")} />}
      />
    </div>
  );
}

/* --- Subjects & categories ----------------------------------------------- */

export function SubjectsAdminView() {
  const t = useT();

  return (
    <div className="mx-auto w-full max-w-[90rem]">
      <PageHeading
        title={t("nav.subjects")}
        subtitle="Subjects group lessons and drive the colour of every card in the product."
        actions={<Button leadingIcon={<Plus className="h-4 w-4" />}>New subject</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {subjects.map((subject) => (
          <Card key={subject.id} interactive>
            <CardBody className="pt-5">
              <div className="flex items-start gap-3">
                <span className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-lg text-3xl", toneStyles[subject.tone].soft)} aria-hidden>
                  {subject.glyph}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="t-h4 truncate text-content">{subject.name}</h3>
                  <p className="t-caption text-content-secondary">{subject.lessonCount} lessons</p>
                </div>
                <IconButton label={`${t("common.edit")} ${subject.name}`} size="icon-sm">
                  <Pencil className="h-4 w-4" />
                </IconButton>
              </div>
              <p className="t-caption mt-3 text-content-secondary">{subject.description}</p>
              <div className="mt-3 flex items-center gap-2">
                <span className={cn("h-3 w-3 rounded-full", toneStyles[subject.tone].solid)} aria-hidden />
                <span className="t-caption font-semibold text-content-secondary">Tone: {subject.tone}</span>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

type CategoryRow = (typeof categories)[number];

export function CategoriesAdminView() {
  const t = useT();
  const { intlLocale } = useI18n();
  const [selected, setSelected] = useState<string[]>([]);

  const columns: Array<Column<CategoryRow>> = [
    { id: "name", header: "Category", primary: true, sortValue: (row) => row.name, cell: (row) => <span className="font-semibold text-content">{row.name}</span> },
    {
      id: "subject",
      header: "Subject",
      cell: (row) => {
        const subject = subjects.find((s) => s.id === row.subjectId);
        return subject ? (
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", toneStyles[subject.tone].solid)} aria-hidden />
            {subject.name}
          </span>
        ) : null;
      },
    },
    { id: "items", header: "Items", align: "right", sortValue: (row) => row.itemCount, cell: (row) => <span className="tabular-nums">{row.itemCount}</span> },
    { id: "status", header: t("common.status"), cell: (row) => <StatusBadge status={row.status} /> },
    {
      id: "updated",
      header: "Updated",
      secondary: true,
      sortValue: (row) => row.updatedAt,
      cell: (row) => <span className="t-caption text-content-secondary">{formatDate(row.updatedAt, intlLocale)}</span>,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[90rem]">
      <PageHeading
        title={t("nav.categories")}
        subtitle="Categories organise content inside a subject."
        actions={<Button leadingIcon={<Plus className="h-4 w-4" />}>New category</Button>}
      />
      <DataTable
        rows={categories}
        columns={columns}
        getRowId={(row) => row.id}
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        caption="Categories"
        emptyState={<EmptyState glyph="🗂️" title={t("state.emptyTitle")} body={t("state.emptyBody")} />}
      />
    </div>
  );
}
