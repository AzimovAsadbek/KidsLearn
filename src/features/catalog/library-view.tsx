"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, List, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/provider";
import type { AgeBand, Difficulty } from "@/types";
import { publishedLessons, progressFor } from "@/data/lessons";
import { games } from "@/data/games";
import { subjects } from "@/data/subjects";
import { useAppStore } from "@/store/app-store";
import { PageHeading } from "@/components/layout/app-shell";
import { Input, Select } from "@/components/ui/field";
import { Tabs } from "@/components/ui/tabs";
import { Button, IconButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { GameCard, LessonCard } from "./cards";

const AGE_BANDS: AgeBand[] = ["1-2", "2-3", "3-4", "4-5", "5-6", "6-7"];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

interface Filters {
  query: string;
  subjectId: string;
  ageBand: string;
  difficulty: string;
}

const EMPTY_FILTERS: Filters = { query: "", subjectId: "", ageBand: "", difficulty: "" };

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
  const [expanded, setExpanded] = useState(false);
  const active = Object.values(filters).filter(Boolean).length;

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
            <option value="">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Age"
            value={filters.ageBand}
            onChange={(e) => onChange({ ...filters, ageBand: e.target.value })}
            className="sm:w-32"
          >
            <option value="">All ages</option>
            {AGE_BANDS.map((band) => (
              <option key={band} value={band}>
                {band} yrs
              </option>
            ))}
          </Select>

          <Select
            aria-label="Difficulty"
            value={filters.difficulty}
            onChange={(e) => onChange({ ...filters, difficulty: e.target.value })}
            className="sm:w-36"
          >
            <option value="">All levels</option>
            {DIFFICULTIES.map((level) => (
              <option key={level} value={level}>
                {t(`lesson.difficulty${level[0].toUpperCase()}${level.slice(1)}` as "lesson.difficultyEasy")}
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

export function LessonLibraryView() {
  const t = useT();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const childId = useAppStore((s) => s.selectedChildId);

  const results = useMemo(
    () =>
      publishedLessons.filter((lesson) => {
        if (filters.query && !lesson.title.toLowerCase().includes(filters.query.toLowerCase())) return false;
        if (filters.subjectId && lesson.subjectId !== filters.subjectId) return false;
        if (filters.ageBand && lesson.ageBand !== filters.ageBand) return false;
        if (filters.difficulty && lesson.difficulty !== filters.difficulty) return false;
        return true;
      }),
    [filters],
  );

  return (
    <div className="mx-auto w-full max-w-[95rem]">
      <PageHeading
        title={t("nav.lessons")}
        subtitle={`${publishedLessons.length} published lessons across ${subjects.length} subjects.`}
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

      <FilterBar filters={filters} onChange={setFilters} onReset={() => setFilters(EMPTY_FILTERS)} />

      {results.length === 0 ? (
        <EmptyState
          glyph="🔍"
          title={t("state.noResultsTitle")}
          body={t("state.noResultsBody")}
          action={<Button onClick={() => setFilters(EMPTY_FILTERS)}>{t("common.clearFilters")}</Button>}
        />
      ) : (
        <div className={cn("grid gap-4", layout === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
          {results.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} percent={progressFor(childId, lesson.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

export function GameLibraryView() {
  const t = useT();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [tab, setTab] = useState<"all" | "popular" | "new">("all");

  const results = useMemo(() => {
    let list = games.filter((game) => game.status === "published");
    if (filters.query) list = list.filter((g) => g.title.toLowerCase().includes(filters.query.toLowerCase()));
    if (filters.subjectId) list = list.filter((g) => g.subjectId === filters.subjectId);
    if (filters.ageBand) list = list.filter((g) => g.ageBand === filters.ageBand);
    if (filters.difficulty) list = list.filter((g) => g.difficulty === filters.difficulty);
    if (tab === "popular") list = [...list].sort((a, b) => b.plays - a.plays);
    if (tab === "new") list = [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return list;
  }, [filters, tab]);

  return (
    <div className="mx-auto w-full max-w-[95rem]">
      <PageHeading
        title={t("nav.games")}
        subtitle="Six game engines, each tuned to a different way of learning."
      />

      <Tabs
        variant="pill"
        className="mb-4"
        ariaLabel="Game sorting"
        value={tab}
        onChange={setTab}
        items={[
          { id: "all", label: "All games", count: games.length },
          { id: "popular", label: "Most played" },
          { id: "new", label: "Recently updated" },
        ]}
      />

      <FilterBar filters={filters} onChange={setFilters} onReset={() => setFilters(EMPTY_FILTERS)} />

      {results.length === 0 ? (
        <EmptyState
          glyph="🎮"
          title={t("state.noResultsTitle")}
          body={t("state.noResultsBody")}
          action={<Button onClick={() => setFilters(EMPTY_FILTERS)}>{t("common.clearFilters")}</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
