"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Ban, Mail, Plus, Search, UserCheck } from "lucide-react";
import { calculateAge, cn, formatDate, formatRelativeTime } from "@/lib/utils";
import { toneStyles } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import type { AccountStatus, AdminUser, Child, UserRole } from "@/types";
import { adminUsers } from "@/data/admin";
import { children, NOW } from "@/data/children";
import { getSubject } from "@/data/subjects";
import { useAppStore } from "@/store/app-store";
import { PageHeading } from "@/components/layout/app-shell";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/states";

const STATUS_TONE: Record<AccountStatus, "mint" | "sun" | "coral"> = {
  active: "mint",
  invited: "sun",
  suspended: "coral",
};

/**
 * One table serves users, parents and children; the `role` prop only narrows
 * the dataset and the copy, so filtering, sorting and bulk actions stay in one
 * place.
 */
export function UsersAdminView({ role }: { role?: UserRole }) {
  const t = useT();
  const { intlLocale } = useI18n();
  const pushToast = useAppStore((s) => s.pushToast);

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>(role ?? "");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const rows = useMemo(
    () =>
      adminUsers.filter((user) => {
        const needle = query.trim().toLowerCase();
        if (
          needle &&
          !user.name.toLowerCase().includes(needle) &&
          !user.email.toLowerCase().includes(needle) &&
          !user.phone.includes(needle)
        ) {
          return false;
        }
        if (roleFilter && user.role !== roleFilter) return false;
        if (statusFilter && user.status !== statusFilter) return false;
        return true;
      }),
    [query, roleFilter, statusFilter],
  );

  const columns: Array<Column<AdminUser>> = [
    {
      id: "name",
      header: "User",
      primary: true,
      sortValue: (row) => row.name,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar spec={row.avatar} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-content">{row.name}</p>
            <p className="t-caption truncate text-content-secondary">{row.email}</p>
          </div>
        </div>
      ),
    },
    { id: "phone", header: "Phone", secondary: true, cell: (row) => <span className="tabular-nums text-content-secondary">{row.phone}</span> },
    {
      id: "role",
      header: "Role",
      width: "w-28",
      sortValue: (row) => row.role,
      cell: (row) => (
        <Badge tone={row.role === "admin" ? "grape" : "sky"} size="sm">
          {row.role === "admin" ? "Admin" : "Parent"}
        </Badge>
      ),
    },
    {
      id: "children",
      header: "Children",
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
      cell: (row) => (
        <Badge tone={STATUS_TONE[row.status]} size="sm">
          <span className={cn("h-1.5 w-1.5 rounded-full", toneStyles[STATUS_TONE[row.status]].solid)} aria-hidden />
          {row.status[0].toUpperCase() + row.status.slice(1)}
        </Badge>
      ),
    },
    {
      id: "created",
      header: "Joined",
      secondary: true,
      sortValue: (row) => row.createdAt,
      cell: (row) => <span className="t-caption text-content-secondary">{formatDate(row.createdAt, intlLocale)}</span>,
    },
    {
      id: "lastSeen",
      header: "Last active",
      sortValue: (row) => row.lastSeenAt,
      cell: (row) => (
        <span className="t-caption text-content-secondary">{formatRelativeTime(row.lastSeenAt, NOW, intlLocale)}</span>
      ),
    },
  ];

  const title = role === "parent" ? t("nav.parents") : t("nav.users");

  return (
    <div className="mx-auto w-full max-w-[100rem]">
      <PageHeading
        title={title}
        subtitle={`${rows.length} of ${adminUsers.length} accounts match your filters.`}
        actions={<Button leadingIcon={<Plus className="h-4 w-4" />}>Invite user</Button>}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone="brand" glyph="👥" label="All accounts" value={adminUsers.length} />
        <StatCard tone="mint" glyph="✅" label="Active" value={adminUsers.filter((u) => u.status === "active").length} />
        <StatCard tone="sun" glyph="✉️" label="Invited" value={adminUsers.filter((u) => u.status === "invited").length} />
        <StatCard tone="coral" glyph="⛔" label="Suspended" value={adminUsers.filter((u) => u.status === "suspended").length} />
      </div>

      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="min-w-56 flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email or phone…"
              aria-label={t("common.search")}
              leadingIcon={<Search className="h-4 w-4" />}
            />
          </div>
          {!role ? (
            <Select aria-label="Role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="sm:w-40">
              <option value="">All roles</option>
              <option value="parent">Parents</option>
              <option value="admin">Admins</option>
            </Select>
          ) : null}
          <Select aria-label={t("common.status")} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-40">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="invited">Invited</option>
            <option value="suspended">Suspended</option>
          </Select>
        </div>

        {selected.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary-soft px-4 py-2.5">
            <p className="t-label text-primary">{t("admin.selected", { count: selected.length })}</p>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                leadingIcon={<Mail className="h-3.5 w-3.5" />}
                onClick={() => {
                  pushToast({ title: `Email queued for ${selected.length} users`, tone: "sky", glyph: "✉️" });
                  setSelected([]);
                }}
              >
                Email
              </Button>
              <Button
                size="sm"
                variant="secondary"
                leadingIcon={<UserCheck className="h-3.5 w-3.5" />}
                onClick={() => {
                  pushToast({ title: `${selected.length} users activated`, tone: "mint", glyph: "✅" });
                  setSelected([]);
                }}
              >
                Activate
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-danger"
                leadingIcon={<Ban className="h-3.5 w-3.5" />}
                onClick={() => {
                  pushToast({ title: `${selected.length} users suspended`, tone: "coral", glyph: "⛔" });
                  setSelected([]);
                }}
              >
                Suspend
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        pageSize={12}
        caption="Platform users"
        emptyState={
          <EmptyState
            glyph="🔍"
            title={t("state.noResultsTitle")}
            body={t("state.noResultsBody")}
            action={
              <Button
                onClick={() => {
                  setQuery("");
                  setRoleFilter(role ?? "");
                  setStatusFilter("");
                }}
              >
                {t("common.clearFilters")}
              </Button>
            }
          />
        }
      />
    </div>
  );
}

/* --- Children ------------------------------------------------------------ */

export function ChildrenAdminView() {
  const t = useT();
  const { intlLocale } = useI18n();
  const [query, setQuery] = useState("");

  const rows = useMemo(
    () => children.filter((child) => child.name.toLowerCase().includes(query.trim().toLowerCase())),
    [query],
  );

  const columns: Array<Column<Child>> = [
    {
      id: "name",
      header: "Child",
      primary: true,
      sortValue: (row) => row.name,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar spec={row.avatar} size="sm" />
          <div className="min-w-0">
            <Link href={`/children/${row.id}`} className="truncate font-semibold text-content hover:text-primary">
              {row.name}
            </Link>
            <p className="t-caption text-content-secondary">{calculateAge(row.birthDate, NOW)} years</p>
          </div>
        </div>
      ),
    },
    { id: "level", header: "Level", width: "w-24", sortValue: (row) => row.level, cell: (row) => <Badge tone="brand" size="sm">Lv {row.level}</Badge> },
    { id: "xp", header: "XP", align: "right", sortValue: (row) => row.xp, cell: (row) => <span className="tabular-nums">{row.xp}</span> },
    { id: "stars", header: "Stars", align: "right", sortValue: (row) => row.stars, cell: (row) => <span className="tabular-nums">⭐ {row.stars}</span> },
    { id: "streak", header: "Streak", align: "right", secondary: true, sortValue: (row) => row.streakDays, cell: (row) => <span className="tabular-nums">🔥 {row.streakDays}</span> },
    { id: "accuracy", header: "Accuracy", align: "right", secondary: true, sortValue: (row) => row.accuracy, cell: (row) => `${row.accuracy}%` },
    {
      id: "favourite",
      header: "Favourite",
      secondary: true,
      cell: (row) => {
        const subject = getSubject(row.favouriteSubjectId);
        return (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden>{subject.glyph}</span>
            {subject.name}
          </span>
        );
      },
    },
    {
      id: "active",
      header: "Last active",
      sortValue: (row) => row.lastActiveAt,
      cell: (row) => <span className="t-caption text-content-secondary">{formatRelativeTime(row.lastActiveAt, NOW, intlLocale)}</span>,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[100rem]">
      <PageHeading title={t("nav.children")} subtitle="Learner profiles across every family account." />

      <div className="mb-4 max-w-md">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search children…"
          aria-label={t("common.search")}
          leadingIcon={<Search className="h-4 w-4" />}
        />
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        caption="Children"
        emptyState={<EmptyState glyph="🧒" title={t("state.noResultsTitle")} body={t("state.noResultsBody")} />}
      />
    </div>
  );
}
