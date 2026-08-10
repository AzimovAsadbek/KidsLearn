"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid, List, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n, useT } from "@/i18n/provider";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { fetchGames, fetchLessons, fetchSubjects, queryKeys } from "@/lib/api/queries";
import { useOptionalChildContext } from "@/components/providers/child-provider";
import { PageHeading } from "@/components/layout/app-shell";
import { Input, Select } from "@/components/ui/field";
import { Tabs } from "@/components/ui/tabs";
import { Button, IconButton } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Pagination } from "@/components/ui/data-table";
import { GameCard, LessonCard } from "./cards";

/** API enum values with their translation keys — the UI never shows raw enums. */
const AGE_OPTIONS = [
  { value: "AGE_1_2", labelKey: "age.band1_2" },
  { value: "AGE_3_4", labelKey: "age.band3_4" },
  { value: "AGE_5_7", labelKey: "age.band5_7" },
] as const;

const DIFFICULTY_OPTIONS = [
  { value: "EASY", labelKey: "lesson.difficultyEasy" },
  { value: "MEDIUM", labelKey: "lesson.difficultyMedium" },
  { value: "HARD", labelKey: "lesson.difficultyHard" },
] as const;

interface Filters {
  query: string;
  subjectId: string;
  ageCategory: string;
  difficulty: string;
}

const EMPTY_FILTERS: Filters = { query: "", subjectId: "", ageCategory: "", difficulty: "" };

function FilterBar({
  filters,
  onChange,
  onReset,
  extra,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  onReset: () => void;
  extra?: React.ReactNode;
}) {
  const t = useT();
  const { locale } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const active = Object.values(filters).filter(Boolean).length;

  const { data: subjects } = useQuery({
    queryKey: [...queryKeys.subjects, locale],
    queryFn: () => fetchSubjects(locale),
  });

  return (
    <div className="mb-5 rounded-xl border border-border bg-surface p-3 shadow-soft sm:p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-56 flex-1">
          <Input
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            placeholder={t("common.searchPlaceholder")}
            aria-label={t("common.search")}
            leadingIcon={<Search className="h-4 w-4" />}
          />
        </div>

        <Button
          variant={expanded ? "soft" : "secondary"}
          leadingIcon={<SlidersHorizontal className="h-4 w-4" />}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="sm:hidden"
        >
          {t("common.filters")}
          {active > 0 ? ` (${active})` : ""}
        </Button>

        <div className={cn("w-full gap-3 sm:flex sm:w-auto", expanded ? "flex flex-col" : "hidden")}>
          <Select
            aria-label={t("nav.subjects")}
            value={filters.subjectId}
            onChange={(e) => onChange({ ...filters, subjectId: e.target.value })}
            className="sm:w-44"
          >
            <option value="">{t("filter.allSubjects")}</option>
            {(subjects ?? []).map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </Select>

          <Select
            aria-label={t("filter.age")}
            value={filters.ageCategory}
            onChange={(e) => onChange({ ...filters, ageCategory: e.target.value })}
            className="sm:w-36"
          >
            <option value="">{t("filter.allAges")}</option>
            {AGE_OPTIONS.map((band) => (
              <option key={band.value} value={band.value}>
                {t(band.labelKey)}
              </option>
            ))}
          </Select>

          <Select
            aria-label={t("filter.difficulty")}
            value={filters.difficulty}
            onChange={(e) => onChange({ ...filters, difficulty: e.target.value })}
            className="sm:w-36"
          >
            <option value="">{t("filter.allLevels")}</option>
            {DIFFICULTY_OPTIONS.map((level) => (
              <option key={level.value} value={level.value}>
                {t(level.labelKey)}
              </option>
            ))}
          </Select>

          {active > 0 ? (
            <Button variant="ghost" onClick={onReset}>
              {t("common.clearFilters")}
            </Button>
          ) : null}
        </div>

        {extra}
      </div>
    </div>
  );
}

const PAGE_SIZE = 12;

export function LessonLibraryView() {
  const t = useT();
  const { locale, plural } = useI18n();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const childCtx = useOptionalChildContext();
  const childId = childCtx?.selectedChildId ?? undefined;
  const search = useDebouncedValue(filters.query, 300);

  const lessons = useQuery({
    queryKey: [...queryKeys.lessons({ ...filters, query: search, page, childId, purpose: "library" }), locale],
    queryFn: () =>
      fetchLessons({
        childId,
        search: search || undefined,
        subjectId: filters.subjectId || undefined,
        ageCategory: filters.ageCategory || undefined,
        difficulty: filters.difficulty || undefined,
        page,
        limit: PAGE_SIZE,
        locale,
      }),
    placeholderData: (previous) => previous,
  });

  const total = lessons.data?.meta.total ?? 0;
  const items = lessons.data?.items ?? [];

  function updateFilters(next: Filters) {
    setFilters(next);
    setPage(1);
  }

  return (
    <div className="mx-auto w-full max-w-[95rem]">
      <PageHeading
        title={t("nav.lessons")}
        subtitle={plural("plural.lessonsPublished", total)}
        actions={
          <div className="hidden gap-1 rounded-sm border border-border p-1 sm:flex">
            <IconButton
              label={t("admin.gridView")}
              size="icon-sm"
              variant={layout === "grid" ? "soft" : "ghost"}
              onClick={() => setLayout("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </IconButton>
            <IconButton
              label={t("admin.listView")}
              size="icon-sm"
              variant={layout === "list" ? "soft" : "ghost"}
              onClick={() => setLayout("list")}
            >
              <List className="h-4 w-4" />
            </IconButton>
          </div>
        }
      />

      <FilterBar filters={filters} onChange={updateFilters} onReset={() => updateFilters(EMPTY_FILTERS)} />

      {lessons.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="shimmer h-36 rounded-xl" />
          ))}
        </div>
      ) : lessons.isError ? (
        <ErrorState
          title={t("state.errorTitle")}
          body={t("state.errorBody")}
          action={<Button onClick={() => void lessons.refetch()}>{t("common.retry")}</Button>}
        />
      ) : items.length === 0 ? (
        <EmptyState
          glyph="🔍"
          title={t("state.noResultsTitle")}
          body={t("state.noResultsBody")}
          action={<Button onClick={() => updateFilters(EMPTY_FILTERS)}>{t("common.clearFilters")}</Button>}
        />
      ) : (
        <>
          <div className={cn("grid gap-4", layout === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
            {items.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))}
          </div>
          <Pagination
            className="mt-6"
            page={page}
            totalPages={lessons.data?.meta.totalPages ?? 1}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}

export function GameLibraryView() {
  const t = useT();
  const { locale } = useI18n();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [tab, setTab] = useState<"all" | "popular" | "new">("all");
  const [page, setPage] = useState(1);
  const childCtx = useOptionalChildContext();
  const childId = childCtx?.selectedChildId ?? undefined;
  const search = useDebouncedValue(filters.query, 300);

  const games = useQuery({
    queryKey: [...queryKeys.games({ ...filters, query: search, tab, page, childId, purpose: "library" }), locale],
    queryFn: () =>
      fetchGames({
        childId,
        search: search || undefined,
        subjectId: filters.subjectId || undefined,
        ageCategory: filters.ageCategory || undefined,
        difficulty: filters.difficulty || undefined,
        sortBy: tab === "popular" ? "plays" : tab === "new" ? "updatedAt" : undefined,
        sortOrder: tab === "all" ? undefined : "desc",
        page,
        limit: PAGE_SIZE,
        locale,
      }),
    placeholderData: (previous) => previous,
  });

  const items = games.data?.items ?? [];

  function updateFilters(next: Filters) {
    setFilters(next);
    setPage(1);
  }

  return (
    <div className="mx-auto w-full max-w-[95rem]">
      <PageHeading title={t("nav.games")} subtitle={t("games.librarySubtitle")} />

      <Tabs
        variant="pill"
        className="mb-4"
        ariaLabel={t("games.sorting")}
        value={tab}
        onChange={(next) => {
          setTab(next);
          setPage(1);
        }}
        items={[
          { id: "all", label: t("games.tabAll"), count: games.data?.meta.total },
          { id: "popular", label: t("games.tabPopular") },
          { id: "new", label: t("games.tabNew") },
        ]}
      />

      <FilterBar filters={filters} onChange={updateFilters} onReset={() => updateFilters(EMPTY_FILTERS)} />

      {games.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="shimmer h-52 rounded-xl" />
          ))}
        </div>
      ) : games.isError ? (
        <ErrorState
          title={t("state.errorTitle")}
          body={t("state.errorBody")}
          action={<Button onClick={() => void games.refetch()}>{t("common.retry")}</Button>}
        />
      ) : items.length === 0 ? (
        <EmptyState
          glyph="🎮"
          title={t("state.noResultsTitle")}
          body={t("state.noResultsBody")}
          action={<Button onClick={() => updateFilters(EMPTY_FILTERS)}>{t("common.clearFilters")}</Button>}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
          <Pagination
            className="mt-6"
            page={page}
            totalPages={games.data?.meta.totalPages ?? 1}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}
