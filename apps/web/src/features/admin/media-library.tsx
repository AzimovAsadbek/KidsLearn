"use client";

import { useMemo, useRef, useState } from "react";
import { Grid3x3, List, Search, Trash2, Upload, X } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { toneStyles } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import type { MediaAsset, MediaKind } from "@/types";
import { mediaAssets } from "@/data/admin";
import { useAppStore } from "@/store/app-store";
import { PageHeading } from "@/components/layout/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Button, IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { Drawer } from "@/components/ui/overlay";

const KIND_LABEL: Record<MediaKind | "all", string> = {
  all: "All",
  image: "Images",
  video: "Videos",
  audio: "Audio",
  avatar: "Avatars",
  generated: "Generated",
};

function formatSize(kb: number): string {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

export function MediaLibraryView() {
  const t = useT();
  const { intlLocale } = useI18n();
  const pushToast = useAppStore((s) => s.pushToast);

  const [kind, setKind] = useState<MediaKind | "all">("all");
  const [query, setQuery] = useState("");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [preview, setPreview] = useState<MediaAsset | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const assets = useMemo(
    () =>
      mediaAssets.filter((asset) => {
        if (kind !== "all" && asset.kind !== kind) return false;
        if (query && !asset.name.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      }),
    [kind, query],
  );

  return (
    <div className="mx-auto w-full max-w-[100rem]">
      <PageHeading
        title={t("nav.media")}
        subtitle={`${mediaAssets.length} assets · ${mediaAssets.filter((a) => a.kind === "generated").length} AI generated`}
        actions={<FileUploader />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs
          variant="pill"
          ariaLabel="Media type"
          value={kind}
          onChange={setKind}
          items={(["all", "image", "video", "audio", "avatar", "generated"] as const).map((id) => ({
            id,
            label: KIND_LABEL[id],
            count: id === "all" ? mediaAssets.length : mediaAssets.filter((a) => a.kind === id).length,
          }))}
        />

        <div className="ml-auto flex items-center gap-3">
          <div className="w-56">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files…"
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
              Clear
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-danger"
              leadingIcon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={() => {
                pushToast({ title: `${selected.length} assets queued for deletion`, tone: "coral", glyph: "🗑️" });
                setSelected([]);
              }}
            >
              {t("common.delete")}
            </Button>
          </div>
        </div>
      ) : null}

      {assets.length === 0 ? (
        <EmptyState
          glyph="🖼️"
          title="No media here"
          body="Upload an asset or generate one with AI to fill this library."
          action={<FileUploader />}
        />
      ) : layout === "grid" ? (
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
                  className={cn("grid aspect-square w-full place-items-center text-5xl", toneStyles[asset.tone].soft)}
                  aria-label={`Preview ${asset.name}`}
                >
                  <span aria-hidden>{asset.glyph}</span>
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
                    aria-label={`Select ${asset.name}`}
                  />
                </label>

                {asset.kind === "generated" ? (
                  <span className="absolute right-2 top-2 rounded-full bg-grape-core px-2 py-0.5 text-[0.625rem] font-bold text-white">
                    AI
                  </span>
                ) : null}

                <div className="border-t border-border p-2.5">
                  <p className="t-caption truncate font-semibold text-content">{asset.name}</p>
                  <p className="t-caption text-content-tertiary">{formatSize(asset.sizeKb)}</p>
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
                    <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-sm text-2xl", toneStyles[asset.tone].soft)} aria-hidden>
                      {asset.glyph}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="t-body-sm block truncate font-semibold text-content">{asset.name}</span>
                      <span className="t-caption block text-content-secondary">
                        {KIND_LABEL[asset.kind]} · {formatSize(asset.sizeKb)}
                        {asset.dimensions ? ` · ${asset.dimensions}` : ""}
                      </span>
                    </span>
                    <span className="hidden sm:block">
                      <StatusBadge status={asset.status} />
                    </span>
                    <span className="t-caption hidden shrink-0 text-content-tertiary md:block">
                      {formatDate(asset.uploadedAt, intlLocale)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <MediaPreviewDrawer asset={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

/** Drag-and-drop uploader with a visible drop target and a file input fallback. */
export function FileUploader({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const pushToast = useAppStore((s) => s.pushToast);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function accept(files: FileList | null) {
    if (!files || files.length === 0) return;
    pushToast({
      title: `${files.length} file${files.length > 1 ? "s" : ""} queued`,
      description: "Assets appear in the library once processing finishes.",
      tone: "mint",
      glyph: "📤",
    });
  }

  if (compact) {
    return (
      <>
        <Button variant="secondary" leadingIcon={<Upload className="h-4 w-4" />} onClick={() => inputRef.current?.click()}>
          {t("admin.uploadMedia")}
        </Button>
        <input ref={inputRef} type="file" multiple hidden onChange={(e) => accept(e.target.files)} />
      </>
    );
  }

  return (
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
      <p className="t-caption hidden text-content-secondary sm:block">Drop files here or</p>
      <Button size="sm" onClick={() => inputRef.current?.click()}>
        {t("admin.uploadMedia")}
      </Button>
      <input ref={inputRef} type="file" multiple hidden onChange={(e) => accept(e.target.files)} />
    </div>
  );
}

function MediaPreviewDrawer({ asset, onClose }: { asset: MediaAsset | null; onClose: () => void }) {
  const t = useT();
  const { intlLocale } = useI18n();
  const pushToast = useAppStore((s) => s.pushToast);

  return (
    <Drawer open={Boolean(asset)} onClose={onClose} title="Asset details">
      {asset ? (
        <div className="p-5">
          <div className={cn("grid aspect-square w-full place-items-center rounded-xl text-8xl", toneStyles[asset.tone].soft)} aria-hidden>
            {asset.glyph}
          </div>

          <h3 className="t-h4 mt-4 break-all text-content">{asset.name}</h3>
          <div className="mt-2">
            <StatusBadge status={asset.status} />
          </div>

          <dl className="mt-4 space-y-2.5">
            {[
              ["Type", KIND_LABEL[asset.kind]],
              ["Size", formatSize(asset.sizeKb)],
              ...(asset.dimensions ? [["Dimensions", asset.dimensions]] : []),
              ...(asset.durationSeconds ? [["Duration", `${asset.durationSeconds}s`]] : []),
              ["Uploaded", formatDate(asset.uploadedAt, intlLocale)],
              ["Used in", `${asset.usedIn} lessons`],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0">
                <dt className="t-caption text-content-secondary">{label}</dt>
                <dd className="t-caption font-semibold text-content">{value}</dd>
              </div>
            ))}
          </dl>

          {asset.aiPrompt ? (
            <div className="mt-4 rounded-lg bg-grape-soft p-3 dark:bg-grape-core/15">
              <p className="t-overline text-grape-deep dark:text-grape-core">AI prompt</p>
              <p className="t-caption mt-1 text-content">{asset.aiPrompt}</p>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => pushToast({ title: "Asset inserted", tone: "mint", glyph: "✅" })}>
              {t("ai.useImage")}
            </Button>
            <Button size="sm" variant="secondary">
              Replace
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-danger"
              leadingIcon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={() => {
                pushToast({ title: "Asset deleted", tone: "coral", glyph: "🗑️" });
                onClose();
              }}
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
