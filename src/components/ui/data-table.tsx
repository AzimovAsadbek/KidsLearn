"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Provide to make the column sortable. */
  sortValue?: (row: T) => string | number;
  align?: "left" | "center" | "right";
  /** Tailwind width utility, e.g. "w-40". */
  width?: string;
  /** Hidden on narrow desktop widths to keep the table readable. */
  secondary?: boolean;
  /** Used as the headline when the table collapses into cards on mobile. */
  primary?: boolean;
}

export interface SortState {
  columnId: string;
  direction: "asc" | "desc";
}

export interface DataTableProps<T> {
  rows: T[];
  columns: Array<Column<T>>;
  getRowId: (row: T) => string;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onRowClick?: (row: T) => void;
  emptyState?: ReactNode;
  pageSize?: number;
  className?: string;
  caption?: string;
}

/**
 * One table drives every admin list. It owns sorting, selection and pagination,
 * and — importantly — swaps to a stacked card layout on small screens instead of
 * letting the page scroll sideways.
 */
export function DataTable<T>({
  rows,
  columns,
  getRowId,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  onRowClick,
  emptyState,
  pageSize = 10,
  className,
  caption,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(null);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.id === sort.columnId);
    if (!column?.sortValue) return rows;
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = column.sortValue!(a);
      const bv = column.sortValue!(b);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor;
      return String(av).localeCompare(String(bv)) * factor;
    });
  }, [rows, columns, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const pageIds = pageRows.map(getRowId);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  function toggleSort(columnId: string) {
    setSort((current) => {
      if (current?.columnId !== columnId) return { columnId, direction: "asc" };
      if (current.direction === "asc") return { columnId, direction: "desc" };
      return null;
    });
  }

  function toggleRow(id: string) {
    if (!onSelectionChange) return;
    onSelectionChange(
      selectedIds.includes(id) ? selectedIds.filter((s) => s !== id) : [...selectedIds, id],
    );
  }

  if (rows.length === 0 && emptyState) return <>{emptyState}</>;

  return (
    <div className={cn("w-full", className)}>
      {/* ---- Desktop table ------------------------------------------------ */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-surface shadow-soft md:block">
        <div className="scrollbar-slim overflow-x-auto">
          <table className="w-full border-collapse text-left">
            {caption ? <caption className="sr-only">{caption}</caption> : null}
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                {selectable ? (
                  <th scope="col" className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all rows on this page"
                      checked={allOnPageSelected}
                      onChange={() =>
                        onSelectionChange?.(
                          allOnPageSelected
                            ? selectedIds.filter((id) => !pageIds.includes(id))
                            : Array.from(new Set([...selectedIds, ...pageIds])),
                        )
                      }
                      className="h-4 w-4 cursor-pointer rounded-[0.3rem] border-2 border-border-strong accent-[var(--primary)]"
                    />
                  </th>
                ) : null}
                {columns.map((column) => {
                  const active = sort?.columnId === column.id;
                  return (
                    <th
                      key={column.id}
                      scope="col"
                      aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
                      className={cn(
                        "t-overline px-4 py-3 text-content-tertiary",
                        column.width,
                        column.align === "right" && "text-right",
                        column.align === "center" && "text-center",
                        column.secondary && "hidden lg:table-cell",
                      )}
                    >
                      {column.sortValue ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(column.id)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-xs transition-colors hover:text-content",
                            active && "text-primary",
                          )}
                        >
                          {column.header}
                          {active ? (
                            sort.direction === "asc" ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )
                          ) : (
                            <ChevronsUpDown className="h-3 w-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const id = getRowId(row);
                const selected = selectedIds.includes(id);
                return (
                  <tr
                    key={id}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      "border-b border-border transition-colors last:border-0",
                      selected ? "bg-primary-soft/60" : "hover:bg-surface-muted",
                      onRowClick && "cursor-pointer",
                    )}
                  >
                    {selectable ? (
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select row ${id}`}
                          checked={selected}
                          onChange={() => toggleRow(id)}
                          className="h-4 w-4 cursor-pointer rounded-[0.3rem] border-2 border-border-strong accent-[var(--primary)]"
                        />
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className={cn(
                          "px-4 py-3.5 text-sm text-content",
                          column.align === "right" && "text-right",
                          column.align === "center" && "text-center",
                          column.secondary && "hidden lg:table-cell",
                        )}
                      >
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Mobile cards -------------------------------------------------- */}
      <ul className="space-y-3 md:hidden">
        {pageRows.map((row) => {
          const id = getRowId(row);
          const primary = columns.find((c) => c.primary) ?? columns[0];
          const rest = columns.filter((c) => c !== primary);
          return (
            <li key={id}>
              <div
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "rounded-lg border border-border bg-surface p-4 shadow-soft",
                  onRowClick && "cursor-pointer active:scale-[0.99]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">{primary.cell(row)}</div>
                  {selectable ? (
                    <input
                      type="checkbox"
                      aria-label={`Select ${id}`}
                      checked={selectedIds.includes(id)}
                      onChange={() => toggleRow(id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 h-4 w-4 rounded-[0.3rem] border-2 border-border-strong accent-[var(--primary)]"
                    />
                  ) : null}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3">
                  {rest.map((column) => (
                    <div key={column.id} className="min-w-0">
                      <dt className="t-overline text-content-tertiary">{column.header}</dt>
                      <dd className="t-body-sm mt-0.5 truncate text-content">{column.cell(row)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </li>
          );
        })}
      </ul>

      {totalPages > 1 ? (
        <Pagination
          page={safePage}
          totalPages={totalPages}
          totalItems={sorted.length}
          onChange={setPage}
          className="mt-4"
        />
      ) : null}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  onChange,
  className,
}: {
  page: number;
  totalPages: number;
  totalItems?: number;
  onChange: (page: number) => void;
  className?: string;
}) {
  // Always show first, last, current and its neighbours; elide the rest.
  const pages: Array<number | "gap"> = [];
  for (let i = 1; i <= totalPages; i += 1) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== "gap") pages.push("gap");
  }

  return (
    <nav
      className={cn("flex flex-wrap items-center justify-between gap-3", className)}
      aria-label="Pagination"
    >
      {typeof totalItems === "number" ? (
        <p className="t-caption text-content-secondary">
          Page {page} of {totalPages} · {totalItems} items
        </p>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          aria-label="Previous page"
          className="grid h-9 w-9 place-items-center rounded-xs border border-border text-content-secondary transition-colors hover:bg-surface-muted disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((item, index) =>
          item === "gap" ? (
            <span key={`gap-${index}`} className="px-1 text-content-tertiary" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item)}
              aria-current={item === page ? "page" : undefined}
              className={cn(
                "h-9 min-w-9 rounded-xs px-2 text-sm font-semibold transition-colors",
                item === page
                  ? "bg-primary text-primary-on"
                  : "border border-border text-content-secondary hover:bg-surface-muted",
              )}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          aria-label="Next page"
          className="grid h-9 w-9 place-items-center rounded-xs border border-border text-content-secondary transition-colors hover:bg-surface-muted disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
