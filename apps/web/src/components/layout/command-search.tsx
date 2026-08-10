"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneStyles } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSession } from "@/components/providers/session-provider";
import { fetchChildren, fetchGames, fetchLessons, fetchSubjects, queryKeys } from "@/lib/api/queries";
import { Modal } from "@/components/ui/overlay";

interface Hit {
  id: string;
  title: string;
  group: string;
  glyph: string;
  tone: keyof typeof toneStyles;
  href: string;
}

function toneKey(tone: string): keyof typeof toneStyles {
  return (tone in toneStyles ? tone : "brand") as keyof typeof toneStyles;
}

/**
 * Product-wide search over live data. Lessons and games are searched
 * server-side (same index the library uses); children and subjects are small
 * lists filtered locally.
 */
export function CommandSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const { locale } = useI18n();
  const { isAuthenticated, user } = useSession();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const needle = useDebouncedValue(query.trim(), 250);

  const lessons = useQuery({
    queryKey: [...queryKeys.lessons({ search: needle, purpose: "command" }), locale],
    queryFn: () => fetchLessons({ search: needle || undefined, limit: 6, locale }),
    enabled: open && isAuthenticated,
  });

  const games = useQuery({
    queryKey: [...queryKeys.games({ search: needle, purpose: "command" }), locale],
    queryFn: () => fetchGames({ search: needle || undefined, limit: 6, locale }),
    enabled: open && isAuthenticated,
  });

  const subjects = useQuery({
    queryKey: [...queryKeys.subjects, locale],
    queryFn: () => fetchSubjects(locale),
    enabled: open && isAuthenticated,
  });

  const children = useQuery({
    queryKey: queryKeys.children,
    queryFn: fetchChildren,
    enabled: open && isAuthenticated && user?.role === "PARENT",
  });

  const results = useMemo<Hit[]>(() => {
    const lower = needle.toLowerCase();
    const isAdmin = user?.role === "ADMIN";

    const childHits = (children.data ?? [])
      .filter((c) => !lower || c.name.toLowerCase().includes(lower))
      .map<Hit>((c) => ({
        id: c.id,
        title: c.name,
        group: t("search.groupChildren"),
        glyph: c.avatarGlyph,
        tone: toneKey(c.avatarTone),
        href: `/children/${c.id}`,
      }));

    const lessonHits = (lessons.data?.items ?? []).map<Hit>((l) => ({
      id: l.id,
      title: l.title,
      group: t("search.groupLessons"),
      glyph: l.glyph,
      tone: toneKey(l.tone),
      href: isAdmin ? `/admin/lessons?highlight=${l.id}` : `/kids/lessons/${l.slug}`,
    }));

    const gameHits = (games.data?.items ?? []).map<Hit>((g) => ({
      id: g.id,
      title: g.title,
      group: t("search.groupGames"),
      glyph: g.glyph,
      tone: toneKey(g.tone),
      href: isAdmin ? `/admin/games?highlight=${g.id}` : `/kids/games/${g.slug}`,
    }));

    const subjectHits = (subjects.data ?? [])
      .filter((s) => !lower || s.name.toLowerCase().includes(lower))
      .map<Hit>((s) => ({
        id: s.id,
        title: s.name,
        group: t("search.groupSubjects"),
        glyph: s.glyph,
        tone: toneKey(s.tone),
        href: isAdmin ? "/admin/subjects" : `/lessons?subject=${s.slug}`,
      }));

    return [...childHits, ...lessonHits, ...gameHits, ...subjectHits].slice(0, 12);
  }, [needle, children.data, lessons.data, games.data, subjects.data, user?.role, t]);

  const isSearching = lessons.isLoading || games.isLoading;

  // Keep the highlight inside the result set as it shrinks, without an effect.
  const activeIndex = Math.min(cursor, Math.max(0, results.length - 1));

  // "/" opens search from anywhere that isn't already a text field.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (event.key === "/" && !typing && !open) {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("kl:open-search"));
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function go(hit: Hit) {
    router.push(hit.href);
    onClose();
    setQuery("");
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" hideClose>
      <div className="-mx-6 -my-5">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <Search className="h-5 w-5 shrink-0 text-content-tertiary" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor(Math.min(results.length - 1, activeIndex + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor(Math.max(0, activeIndex - 1));
              } else if (e.key === "Enter" && results[activeIndex]) {
                e.preventDefault();
                go(results[activeIndex]);
              }
            }}
            placeholder={t("common.searchPlaceholder")}
            aria-label={t("common.search")}
            className="w-full bg-transparent text-base text-content outline-none placeholder:text-content-tertiary"
          />
          <kbd className="hidden rounded-[0.3rem] border border-border bg-surface-muted px-1.5 py-0.5 text-[0.6875rem] font-semibold text-content-tertiary sm:block">
            Esc
          </kbd>
        </div>

        {results.length === 0 ? (
          <div className="px-6 py-12 text-center">
            {isSearching ? (
              <p className="t-body-sm text-content-secondary">{t("common.loading")}</p>
            ) : (
              <>
                <p className="t-h4 text-content">{t("state.noResultsTitle")}</p>
                <p className="t-body-sm mt-1 text-content-secondary">{t("state.noResultsBody")}</p>
              </>
            )}
          </div>
        ) : (
          <ul className="scrollbar-slim max-h-[24rem] overflow-y-auto p-2">
            {results.map((hit, i) => (
              <li key={`${hit.group}-${hit.id}`}>
                <button
                  type="button"
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => go(hit)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left transition-colors",
                    i === activeIndex ? "bg-primary-soft" : "hover:bg-surface-muted",
                  )}
                >
                  <span
                    className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-sm text-lg", toneStyles[hit.tone].soft)}
                    aria-hidden
                  >
                    {hit.glyph}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="t-body-sm block truncate font-semibold text-content">{hit.title}</span>
                    <span className="t-caption block text-content-secondary">{hit.group}</span>
                  </span>
                  <span className="t-caption hidden text-content-tertiary sm:block">↵</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
