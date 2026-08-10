"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Grid3x3, List, Search, Trash2, Upload, X } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { toneStyles, type Tone } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import type { MediaDto } from "@kidslearn/types";
import { ApiError } from "@/lib/api/client";
import { deleteMedia, fetchMedia, queryKeys, uploadMedia } from "@/lib/api/queries";
import { useAppStore } from "@/store/app-store";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { PageHeading } from "@/components/layout/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Button, IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Drawer, Modal } from "@/components/ui/overlay";
import { Pagination } from "@/components/ui/data-table";

const KIND_TABS = ["all", "IMAGE", "VIDEO", "AUDIO", "AVATAR", "GENERATED", "CERTIFICATE"] as const;
type KindTab = (typeof KIND_TABS)[number];

const KIND_LABEL_KEY = {
  all: "common.all",
  IMAGE: "admin.kindImage",
  VIDEO: "admin.kindVideo",
  AUDIO: "admin.kindAudio",
  AVATAR: "admin.kindAvatar",
  GENERATED: "admin.kindGenerated",
  CERTIFICATE: "admin.kindCertificate",
} as const;

const KIND_STYLE: Record<string, { glyph: string; tone: Tone }> = {
  IMAGE: { glyph: "🖼️", tone: "sky" },
  VIDEO: { glyph: "🎬", tone: "grape" },
  AUDIO: { glyph: "🎵", tone: "tangerine" },
  AVATAR: { glyph: "🙂", tone: "mint" },
  GENERATED: { glyph: "🤖", tone: "blossom" },
  CERTIFICATE: { glyph: "📜", tone: "sun" },
};

const PAGE_SIZE = 24;

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function isImage(asset: MediaDto): boolean {
  return asset.mimeType.startsWith("image/");
}

function kindStyle(kind: string): { glyph: string; tone: Tone } {
  return KIND_STYLE[kind] ?? { glyph: "📦", tone: "brand" };
}

function statusProp(status: string): "draft" | "review" | "published" | "archived" {
  return status.toLowerCase() as "draft" | "review" | "published" | "archived";
}

/** Square thumbnail: the real file for images, a kind glyph for everything else. */
function AssetThumb({ asset, className }: { asset: MediaDto; className?: string }) {
  const style = kindStyle(asset.kind);
  if (isImage(asset)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={asset.url} alt="" loading="lazy" className={cn("h-full w-full object-cover", className)} />
    );
  }
  return (
    <span className={cn("grid h-full w-full place-items-center", toneStyles[style.tone].soft, className)} aria-hidden>
      {style.glyph}
    </span>
  );
}

export function MediaLibraryView() {
  const t = useT();
  const { intlLocale, plural } = useI18n();
  const pushToast = useAppStore((s) => s.pushToast);
  const queryClient = useQueryClient();

  const [kind, setKind] = useState<KindTab>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [preview, setPreview] = useState<MediaDto | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null);

  const search = useDebouncedValue(query, 300);

  const media = useQuery({
    queryKey: queryKeys.media({ kind, search, page }),
    queryFn: () =>
      fetchMedia({
        kind: kind === "all" ? undefined : kind,
        search: search || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    placeholderData: (previous) => previous,
  });

  const removal = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(ids.map((id) => deleteMedia(id)));
      const failed = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
      return { deleted: ids.length - failed.length, failed };
    },
    onSuccess: ({ deleted, failed }, ids) => {
      if (deleted > 0) {
        pushToast({
          title: deleted === 1 ? t("admin.assetDeleted") : t("admin.assetsDeleted", { count: deleted }),
          tone: "coral",
          glyph: "🗑️",
        });
      }
      for (const failure of failed.slice(0, 1)) {
        pushToast({
          title: t("state.errorTitle"),
          description: failure.reason instanceof ApiError ? failure.reason.message : undefined,
          tone: "coral",
          glyph: "⚠️",
        });
      }
      setSelected((current) => current.filter((id) => !ids.includes(id)));
      setPendingDelete(null);
      if (preview && ids.includes(preview.id)) setPreview(null);
      void queryClient.invalidateQueries({ queryKey: ["media"] });
    },
  });

  const assets = media.data?.items ?? [];
  const total = media.data?.meta.total ?? 0;
  const hasFilters = kind !== "all" || search.length > 0;

  return (
    <div className="mx-auto w-full max-w-[100rem]">
      <PageHeading title={t("nav.media")} subtitle={plural("plural.assets", total)} actions={<FileUploader />} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs
          variant="pill"
          ariaLabel={t("admin.assetType")}
          value={kind}
          onChange={(next) => {
            setKind(next);
            setPage(1);
            setSelected([]);
          }}
          items={KIND_TABS.map((id) => ({ id, label: t(KIND_LABEL_KEY[id]) }))}
        />

        <div className="ml-auto flex items-center gap-3">
          <div className="w-56">
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder={t("admin.searchFiles")}
              aria-label={t("common.search")}
              leadingIcon={<Search className="h-4 w-4" />}
            />
          </div>
          <div className="flex gap-1 rounded-sm border border-border p-1">
            <IconButton label={t("admin.gridView")} size="icon-sm" variant={layout === "grid" ? "soft" : "ghost"} onClick={() => setLayout("grid")}>
              <Grid3x3 className="h-4 w-4" />
            </IconButton>
            <IconButton label={t("admin.listView")} size="icon-sm" variant={layout === "list" ? "soft" : "ghost"} onClick={() => setLayout("list")}>
              <List className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      </div>

      {selected.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary-soft px-4 py-2.5">
          <p className="t-label text-primary">{t("admin.selected", { count: selected.length })}</p>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setSelected([])}>
              {t("admin.clearSelection")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-danger"
              leadingIcon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={() => setPendingDelete(selected)}
            >
              {t("common.delete")}
            </Button>
          </div>
        </div>
      ) : null}

      {media.isLoading ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => (
            <li key={i}>
              <div className="shimmer aspect-square rounded-xl" />
            </li>
          ))}
        </ul>
      ) : media.isError ? (
        <ErrorState
          title={t("state.errorTitle")}
          body={t("state.errorBody")}
          action={<Button onClick={() => void media.refetch()}>{t("common.retry")}</Button>}
        />
      ) : assets.length === 0 ? (
        hasFilters ? (
          <EmptyState glyph="🔍" title={t("state.noResultsTitle")} body={t("state.noResultsBody")} />
        ) : (
          <EmptyState glyph="🖼️" title={t("admin.mediaEmptyTitle")} body={t("admin.mediaEmptyBody")} action={<FileUploader />} />
        )
      ) : (
        <>
          {layout === "grid" ? (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
              {assets.map((asset) => (
                <li key={asset.id}>
                  <div
                    className={cn(
                      "group relative overflow-hidden rounded-xl border bg-surface shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-card",
                      selected.includes(asset.id) ? "border-primary ring-2 ring-primary/30" : "border-border",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setPreview(asset)}
                      className="block aspect-square w-full overflow-hidden text-5xl"
                      aria-label={t("admin.previewAsset", { name: asset.filename })}
                    >
                      <AssetThumb asset={asset} />
                    </button>

                    <label className="absolute left-2 top-2 cursor-pointer opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <input
                        type="checkbox"
                        checked={selected.includes(asset.id)}
                        onChange={() =>
                          setSelected((current) =>
                            current.includes(asset.id) ? current.filter((id) => id !== asset.id) : [...current, asset.id],
                          )
                        }
                        className="h-4 w-4 rounded-[0.3rem] border-2 border-border-strong accent-[var(--primary)]"
                        aria-label={t("admin.selectAsset", { name: asset.filename })}
                      />
                    </label>

                    {asset.kind === "GENERATED" ? (
                      <span className="absolute right-2 top-2 rounded-full bg-grape-core px-2 py-0.5 text-[0.625rem] font-bold text-white">
                        AI
                      </span>
                    ) : null}

                    <div className="border-t border-border p-2.5">
                      <p className="t-caption truncate font-semibold text-content">{asset.filename}</p>
                      <p className="t-caption text-content-tertiary">{formatSize(asset.sizeBytes)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Card>
              <CardBody className="p-0">
                <ul className="divide-y divide-border">
                  {assets.map((asset) => (
                    <li key={asset.id}>
                      <button
                        type="button"
                        onClick={() => setPreview(asset)}
                        className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-surface-muted"
                      >
                        <span className="h-12 w-12 shrink-0 overflow-hidden rounded-sm text-2xl">
                          <AssetThumb asset={asset} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="t-body-sm block truncate font-semibold text-content">{asset.filename}</span>
                          <span className="t-caption block text-content-secondary">
                            {t(KIND_LABEL_KEY[asset.kind as KindTab] ?? "common.all")} · {formatSize(asset.sizeBytes)}
                            {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ""}
                          </span>
                        </span>
                        <span className="hidden sm:block">
                          <StatusBadge status={statusProp(asset.status)} />
                        </span>
                        <span className="t-caption hidden shrink-0 text-content-tertiary md:block">
                          {formatDate(asset.createdAt, intlLocale)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}

          {(media.data?.meta.totalPages ?? 1) > 1 ? (
            <Pagination
              className="mt-4"
              page={page}
              totalPages={media.data?.meta.totalPages ?? 1}
              totalItems={total}
              onChange={(next) => {
                setPage(next);
                setSelected([]);
              }}
            />
          ) : null}
        </>
      )}

      <MediaPreviewDrawer asset={preview} onClose={() => setPreview(null)} onDelete={(id) => setPendingDelete([id])} />

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title={
          pendingDelete && pendingDelete.length > 1
            ? t("admin.deleteAssetsTitle", { count: pendingDelete.length })
            : t("admin.deleteAssetTitle")
        }
        description={t("admin.deleteAssetBody")}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              loading={removal.isPending}
              onClick={() => pendingDelete && removal.mutate(pendingDelete)}
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

interface UploadEntry {
  id: string;
  name: string;
  percent: number;
  error?: string;
}

/**
 * Drag-and-drop uploader wired to POST /media/upload — one XHR per file with a
 * live progress bar; failures stay listed with the server's reason.
 */
export function FileUploader({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const pushToast = useAppStore((s) => s.pushToast);
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadEntry[]>([]);

  async function uploadOne(file: File) {
    const id = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setUploads((current) => [...current, { id, name: file.name, percent: 0 }]);
    try {
      await uploadMedia(file, undefined, (percent) =>
        setUploads((current) => current.map((entry) => (entry.id === id ? { ...entry, percent } : entry))),
      );
      setUploads((current) => current.filter((entry) => entry.id !== id));
      pushToast({ title: t("admin.uploadComplete", { name: file.name }), tone: "mint", glyph: "📤" });
      void queryClient.invalidateQueries({ queryKey: ["media"] });
    } catch (error) {
      setUploads((current) =>
        current.map((entry) =>
          entry.id === id
            ? { ...entry, error: error instanceof ApiError ? error.message : t("admin.uploadFailed") }
            : entry,
        ),
      );
    }
  }

  function accept(files: FileList | null) {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) void uploadOne(file);
  }

  const progressList =
    uploads.length > 0 ? (
      <ul className="w-full space-y-1.5">
        {uploads.map((entry) => (
          <li key={entry.id} className="min-w-48">
            <div className="flex items-center gap-2">
              <span className="t-caption min-w-0 flex-1 truncate font-semibold text-content">{entry.name}</span>
              {entry.error ? (
                <IconButton
                  label={t("common.close")}
                  size="icon-sm"
                  onClick={() => setUploads((current) => current.filter((item) => item.id !== entry.id))}
                >
                  <X className="h-3.5 w-3.5" />
                </IconButton>
              ) : (
                <span className="t-caption shrink-0 tabular-nums text-content-secondary">{entry.percent}%</span>
              )}
            </div>
            {entry.error ? (
              <p className="t-caption font-medium text-danger" role="alert">
                {entry.error}
              </p>
            ) : (
              <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                <span className="block h-full rounded-full bg-primary transition-[width]" style={{ width: `${entry.percent}%` }} />
              </span>
            )}
          </li>
        ))}
      </ul>
    ) : null;

  if (compact) {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="secondary" leadingIcon={<Upload className="h-4 w-4" />} onClick={() => inputRef.current?.click()}>
          {t("admin.uploadMedia")}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            accept(e.target.files);
            e.target.value = "";
          }}
        />
        {progressList}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files);
        }}
        className={cn(
          "flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-2.5 transition-colors",
          dragging ? "border-primary bg-primary-soft" : "border-border-strong",
        )}
      >
        <Upload className={cn("h-4 w-4", dragging ? "text-primary" : "text-content-tertiary")} aria-hidden />
        <p className="t-caption hidden text-content-secondary sm:block">{t("admin.dropFilesHere")}</p>
        <Button size="sm" onClick={() => inputRef.current?.click()}>
          {t("admin.uploadMedia")}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            accept(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {progressList}
    </div>
  );
}

function MediaPreviewDrawer({
  asset,
  onClose,
  onDelete,
}: {
  asset: MediaDto | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const t = useT();
  const { intlLocale, plural } = useI18n();

  return (
    <Drawer open={Boolean(asset)} onClose={onClose} title={t("admin.assetDetails")}>
      {asset ? (
        <div className="p-5">
          <div className="aspect-square w-full overflow-hidden rounded-xl text-8xl">
            <AssetThumb asset={asset} />
          </div>

          <h3 className="t-h4 mt-4 break-all text-content">{asset.filename}</h3>
          <div className="mt-2">
            <StatusBadge status={statusProp(asset.status)} />
          </div>

          <dl className="mt-4 space-y-2.5">
            {(
              [
                [t("admin.assetType"), t(KIND_LABEL_KEY[asset.kind as KindTab] ?? "common.all")],
                [t("admin.assetSize"), formatSize(asset.sizeBytes)],
                ...(asset.width && asset.height ? [[t("admin.assetDimensions"), `${asset.width}×${asset.height}`]] : []),
                ...(asset.durationSeconds ? [[t("admin.assetDuration"), `${asset.durationSeconds}s`]] : []),
                [t("admin.assetUploaded"), formatDate(asset.createdAt, intlLocale)],
                ...(asset.createdByName ? [[t("admin.uploadedBy"), asset.createdByName]] : []),
                [t("admin.assetUsedIn"), plural("plural.lessons", asset.usedIn)],
              ] as Array<[string, string]>
            ).map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0">
                <dt className="t-caption text-content-secondary">{label}</dt>
                <dd className="t-caption font-semibold text-content">{value}</dd>
              </div>
            ))}
          </dl>

          {asset.aiPrompt ? (
            <div className="mt-4 rounded-lg bg-grape-soft p-3 dark:bg-grape-core/15">
              <p className="t-overline text-grape-deep dark:text-grape-core">{t("admin.aiPromptLabel")}</p>
              <p className="t-caption mt-1 text-content">{asset.aiPrompt}</p>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => window.open(asset.url, "_blank", "noopener")}>
              {t("common.open")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-danger"
              leadingIcon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={() => onDelete(asset.id)}
            >
              {t("common.delete")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid h-full place-items-center p-6 text-center">
          <X className="h-6 w-6 text-content-tertiary" aria-hidden />
        </div>
      )}
    </Drawer>
  );
}
