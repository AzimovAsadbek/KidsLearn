"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Search, UserCheck } from "lucide-react";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";
import { toneStyles, TONES, type Tone } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import type { ChildDto } from "@kidslearn/types";
import { ApiError } from "@/lib/api/client";
import { fetchAdminUsers, fetchChildren, queryKeys, updateAdminUser, type AdminUserRow } from "@/lib/api/queries";
import { useAppStore } from "@/store/app-store";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { PageHeading } from "@/components/layout/app-shell";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState, ErrorState, SkeletonTable } from "@/components/ui/states";

const STATUS_TONE: Record<string, "mint" | "sun" | "coral"> = {
  ACTIVE: "mint",
  INVITED: "sun",
  SUSPENDED: "coral",
};

const STATUS_KEY = {
  ACTIVE: "admin.statusActive",
  INVITED: "admin.statusInvited",
  SUSPENDED: "admin.statusSuspended",
} as const;

const PAGE_SIZE = 12;

function toneOf(tone: string): Tone {
  return (TONES as readonly string[]).includes(tone) ? (tone as Tone) : "brand";
}

/** meta.total for one role/status combination — powers the header stat cards. */
function useAccountCount(role: string | undefined, status?: string) {
  return useQuery({
    queryKey: queryKeys.adminUsers({ role: role ?? null, status: status ?? null, purpose: "count" }),
    queryFn: () => fetchAdminUsers({ role, status, page: 1, limit: 1 }),
    select: (page) => page.meta.total,
  });
}

/**
 * One table serves users and parents; the `role` prop only narrows the dataset
 * and the copy, so filtering, selection and the status mutations stay in one
 * place. Every action here is a real `/admin/users` call.
 */
export function UsersAdminView({ role }: { role?: "parent" }) {
  const t = useT();
  const { intlLocale, plural } = useI18n();
  const pushToast = useAppStore((s) => s.pushToast);
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>(role ? "PARENT" : "");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  const search = useDebouncedValue(query, 300);
  const roleParam = role ? "PARENT" : roleFilter || undefined;

  const list = useQuery({
    queryKey: queryKeys.adminUsers({ role: roleParam ?? null, status: statusFilter || null, search, page }),
    queryFn: () =>
      fetchAdminUsers({
        role: roleParam,
        status: statusFilter || undefined,
        search: search || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    placeholderData: (previous) => previous,
  });

  const allCount = useAccountCount(roleParam);
  const activeCount = useAccountCount(roleParam, "ACTIVE");
  const invitedCount = useAccountCount(roleParam, "INVITED");
  const suspendedCount = useAccountCount(roleParam, "SUSPENDED");

  const bulkStatus = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: "ACTIVE" | "SUSPENDED" }) =>
      Promise.all(ids.map((id) => updateAdminUser(id, { status }))),
    onSuccess: (_data, variables) => {
      pushToast({
        title: t("admin.usersUpdated", { count: variables.ids.length }),
        tone: variables.status === "ACTIVE" ? "mint" : "coral",
        glyph: variables.status === "ACTIVE" ? "✅" : "⛔",
      });
      setSelected([]);
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
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

  function resetToFirstPage() {
    setPage(1);
    setSelected([]);
  }

  const rows = list.data?.items ?? [];
  const total = list.data?.meta.total ?? 0;

  const columns: Array<Column<AdminUserRow>> = [
    {
      id: "name",
      header: t("admin.colUser"),
      primary: true,
      sortValue: (row) => row.name,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar spec={{ glyph: row.avatarGlyph, tone: toneOf(row.avatarTone) }} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-content">{row.name}</p>
            <p className="t-caption truncate text-content-secondary">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: "phone",
      header: t("admin.colPhone"),
      secondary: true,
      cell: (row) => <span className="tabular-nums text-content-secondary">{row.phone ?? "—"}</span>,
    },
    {
      id: "role",
      header: t("admin.colRole"),
      width: "w-28",
      sortValue: (row) => row.role,
      cell: (row) => (
        <Badge tone={row.role === "ADMIN" ? "grape" : "sky"} size="sm">
          {row.role === "ADMIN" ? t("nav.admin") : t("nav.parent")}
        </Badge>
      ),
    },
    {
      id: "children",
      header: t("nav.children"),
      align: "right",
      width: "w-24",
      sortValue: (row) => row.childrenCount,
      cell: (row) => <span className="tabular-nums text-content-secondary">{row.childrenCount}</span>,
    },
    {
      id: "status",
      header: t("common.status"),
      width: "w-32",
      sortValue: (row) => row.status,
      cell: (row) => {
        const tone = STATUS_TONE[row.status] ?? "sun";
        return (
          <Badge tone={tone} size="sm">
            <span className={cn("h-1.5 w-1.5 rounded-full", toneStyles[tone].solid)} aria-hidden />
            {t(STATUS_KEY[row.status as keyof typeof STATUS_KEY] ?? "admin.statusActive")}
          </Badge>
        );
      },
    },
    {
      id: "created",
      header: t("admin.colJoined"),
      secondary: true,
      sortValue: (row) => row.createdAt,
      cell: (row) => <span className="t-caption text-content-secondary">{formatDate(row.createdAt, intlLocale)}</span>,
    },
    {
      id: "lastSeen",
      header: t("admin.colLastActive"),
      sortValue: (row) => row.lastSeenAt ?? "",
      cell: (row) => (
        <span className="t-caption text-content-secondary">
          {row.lastSeenAt ? formatRelativeTime(row.lastSeenAt, new Date(), intlLocale) : "—"}
        </span>
      ),
    },
  ];

  const title = role === "parent" ? t("nav.parents") : t("nav.users");

  return (
    <div className="mx-auto w-full max-w-[100rem]">
      <PageHeading title={title} subtitle={plural("plural.accounts", total)} />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone="brand" glyph="👥" label={t("admin.allAccounts")} value={allCount.data ?? "—"} />
        <StatCard tone="mint" glyph="✅" label={t("admin.statusActive")} value={activeCount.data ?? "—"} />
        <StatCard tone="sun" glyph="✉️" label={t("admin.statusInvited")} value={invitedCount.data ?? "—"} />
        <StatCard tone="coral" glyph="⛔" label={t("admin.statusSuspended")} value={suspendedCount.data ?? "—"} />
      </div>

      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="min-w-56 flex-1">
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                resetToFirstPage();
              }}
              placeholder={t("admin.searchUsers")}
              aria-label={t("common.search")}
              leadingIcon={<Search className="h-4 w-4" />}
            />
          </div>
          {!role ? (
            <Select
              aria-label={t("admin.colRole")}
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                resetToFirstPage();
              }}
              className="sm:w-40"
            >
              <option value="">{t("admin.allRoles")}</option>
              <option value="PARENT">{t("nav.parents")}</option>
              <option value="ADMIN">{t("nav.admin")}</option>
            </Select>
          ) : null}
          <Select
            aria-label={t("common.status")}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              resetToFirstPage();
            }}
            className="sm:w-40"
          >
            <option value="">{t("admin.allStatuses")}</option>
            <option value="ACTIVE">{t("admin.statusActive")}</option>
            <option value="INVITED">{t("admin.statusInvited")}</option>
            <option value="SUSPENDED">{t("admin.statusSuspended")}</option>
          </Select>
        </div>

        {selected.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary-soft px-4 py-2.5">
            <p className="t-label text-primary">{t("admin.selected", { count: selected.length })}</p>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                loading={bulkStatus.isPending && bulkStatus.variables?.status === "ACTIVE"}
                leadingIcon={<UserCheck className="h-3.5 w-3.5" />}
                onClick={() => bulkStatus.mutate({ ids: selected, status: "ACTIVE" })}
              >
                {t("admin.activate")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-danger"
                loading={bulkStatus.isPending && bulkStatus.variables?.status === "SUSPENDED"}
                leadingIcon={<Ban className="h-3.5 w-3.5" />}
                onClick={() => bulkStatus.mutate({ ids: selected, status: "SUSPENDED" })}
              >
                {t("admin.suspend")}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {list.isLoading ? (
        <SkeletonTable rows={8} columns={6} />
      ) : list.isError ? (
        <ErrorState
          title={t("state.errorTitle")}
          body={t("state.errorBody")}
          action={<Button onClick={() => void list.refetch()}>{t("common.retry")}</Button>}
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
            caption={title}
            emptyState={
              <EmptyState
                glyph="🔍"
                title={t("state.noResultsTitle")}
                body={t("state.noResultsBody")}
                action={
                  <Button
                    onClick={() => {
                      setQuery("");
                      setRoleFilter(role ? "PARENT" : "");
                      setStatusFilter("");
                      resetToFirstPage();
                    }}
                  >
                    {t("common.clearFilters")}
                  </Button>
                }
              />
            }
          />
          {(list.data?.meta.totalPages ?? 1) > 1 ? (
            <Pagination
              className="mt-4"
              page={page}
              totalPages={list.data?.meta.totalPages ?? 1}
              totalItems={total}
              onChange={(next) => {
                setPage(next);
                setSelected([]);
              }}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

/* --- Children ------------------------------------------------------------ */

export function ChildrenAdminView() {
  const t = useT();
  const { intlLocale } = useI18n();
  const [query, setQuery] = useState("");

  const children = useQuery({ queryKey: queryKeys.children, queryFn: fetchChildren });

  const rows = (children.data ?? []).filter((child) =>
    child.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const columns: Array<Column<ChildDto>> = [
    {
      id: "name",
      header: t("admin.colChild"),
      primary: true,
      sortValue: (row) => row.name,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar spec={{ glyph: row.avatarGlyph, tone: toneOf(row.avatarTone) }} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-content">{row.name}</p>
            <p className="t-caption text-content-secondary">{t("parent.ageYears", { age: row.age })}</p>
          </div>
        </div>
      ),
    },
    {
      id: "level",
      header: t("common.level"),
      width: "w-24",
      sortValue: (row) => row.progress?.level ?? 0,
      cell: (row) => (
        <Badge tone="brand" size="sm">
          {t("common.level")} {row.progress?.level ?? 1}
        </Badge>
      ),
    },
    {
      id: "xp",
      header: t("common.xp"),
      align: "right",
      sortValue: (row) => row.progress?.xp ?? 0,
      cell: (row) => <span className="tabular-nums">{row.progress?.xp ?? 0}</span>,
    },
    {
      id: "stars",
      header: t("common.stars"),
      align: "right",
      sortValue: (row) => row.progress?.stars ?? 0,
      cell: (row) => <span className="tabular-nums">⭐ {row.progress?.stars ?? 0}</span>,
    },
    {
      id: "streak",
      header: t("common.streak"),
      align: "right",
      secondary: true,
      sortValue: (row) => row.progress?.currentStreak ?? 0,
      cell: (row) => <span className="tabular-nums">🔥 {row.progress?.currentStreak ?? 0}</span>,
    },
    {
      id: "accuracy",
      header: t("admin.colAccuracy"),
      align: "right",
      secondary: true,
      sortValue: (row) => row.progress?.accuracy ?? 0,
      cell: (row) => `${row.progress?.accuracy ?? 0}%`,
    },
    {
      id: "active",
      header: t("admin.colLastActive"),
      sortValue: (row) => row.progress?.lastActivityAt ?? "",
      cell: (row) => (
        <span className="t-caption text-content-secondary">
          {row.progress?.lastActivityAt
            ? formatRelativeTime(row.progress.lastActivityAt, new Date(), intlLocale)
            : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[100rem]">
      <PageHeading title={t("nav.children")} subtitle={t("admin.childrenSubtitle")} />

      <div className="mb-4 max-w-md">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("admin.searchChildren")}
          aria-label={t("common.search")}
          leadingIcon={<Search className="h-4 w-4" />}
        />
      </div>

      {children.isLoading ? (
        <SkeletonTable rows={6} columns={7} />
      ) : children.isError ? (
        <ErrorState
          title={t("state.errorTitle")}
          body={t("state.errorBody")}
          action={<Button onClick={() => void children.refetch()}>{t("common.retry")}</Button>}
        />
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          caption={t("nav.children")}
          emptyState={<EmptyState glyph="🧒" title={t("state.noResultsTitle")} body={t("state.noResultsBody")} />}
        />
      )}
    </div>
  );
}
