"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneStyles } from "@/lib/tone";
import { useT } from "@/i18n/provider";
import { Modal } from "@/components/ui/overlay";
import { lessons } from "@/data/lessons";
import { games } from "@/data/games";
import { children } from "@/data/children";
import { subjects } from "@/data/subjects";

interface Hit {
  id: string;
  title: string;
  group: string;
  glyph: string;
  tone: keyof typeof toneStyles;
  href: string;
}

/**
 * Product-wide search. Indexes the entities a parent or admin actually looks
 * for; results are grouped and keyboard-navigable.
 */
export function CommandSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  const index = useMemo<Hit[]>(
    () => [
      ...children.map<Hit>((c) => ({
        id: c.id,
        title: c.name,
        group: "Children",
        glyph: c.avatar.glyph,
        tone: c.avatar.tone,
        href: `/children/${c.id}`,
      })),
      ...lessons.map<Hit>((l) => ({
        id: l.id,
        title: l.title,
        group: "Lessons",
        glyph: l.glyph,
        tone: l.tone,
        href: `/lessons#${l.id}`,
      })),
      ...games.map<Hit>((g) => ({
        id: g.id,
        title: g.title,
        group: "Games",
        glyph: g.glyph,
        tone: g.tone,
        href: `/kids/games/${g.id}`,
      })),
      ...subjects.map<Hit>((s) => ({
        id: s.id,
        title: s.name,
        group: "Subjects",
        glyph: s.glyph,
        tone: s.tone,
        href: `/lessons?subject=${s.slug}`,
      })),
    ],
    [],
  );

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return index.slice(0, 8);
    return index.filter((hit) => hit.title.toLowerCase().includes(needle)).slice(0, 12);
  }, [index, query]);

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
            <p className="t-h4 text-content">{t("state.noResultsTitle")}</p>
            <p className="t-body-sm mt-1 text-content-secondary">{t("state.noResultsBody")}</p>
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
