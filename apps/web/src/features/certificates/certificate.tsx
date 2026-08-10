"use client";

import Link from "next/link";
import { Download, Printer, RefreshCw, Share2 } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { useI18n, useT } from "@/i18n/provider";
import type { CertificateDto } from "@kidslearn/types";
import { BrandGlyph } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";

/**
 * The printable artefact. Laid out in absolute proportions so it prints as a
 * single landscape page, and it deliberately avoids photos or personal data.
 */
export function CertificateSheet({ certificate, className }: { certificate: CertificateDto; className?: string }) {
  const t = useT();
  const { intlLocale, plural } = useI18n();

  return (
    <div
      className={cn(
        "relative mx-auto aspect-[1.414/1] w-full overflow-hidden rounded-xl border-2 border-brand-200 bg-white text-[#14152b] shadow-card",
        "dark:border-brand-500/40",
        className,
      )}
    >
      {/* Guilloche-style corner flourishes */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(420px 220px at 0% 0%, rgba(124,77,255,0.10), transparent 60%), radial-gradient(420px 220px at 100% 100%, rgba(255,95,158,0.10), transparent 60%)",
        }}
      />
      <div className="absolute inset-3 rounded-lg border border-brand-200" aria-hidden />
      <div className="absolute inset-4 rounded-md border border-dashed border-brand-100" aria-hidden />

      <div className="relative flex h-full flex-col items-center justify-center px-[8%] text-center">
        <BrandGlyph size={44} />
        <p className="t-overline mt-3 tracking-[0.28em] text-brand-700">KidsLearn</p>

        <h2 className="font-display mt-4 text-[clamp(1.1rem,3.2vw,2rem)] font-extrabold uppercase tracking-[0.14em] text-[#14152b]">
          {t("cert.title")}
        </h2>

        <p className="mt-4 text-[clamp(0.6rem,1.2vw,0.8rem)] font-semibold uppercase tracking-[0.2em] text-[#64688a]">
          {t("cert.awardedTo")}
        </p>
        <p className="font-display mt-1 text-[clamp(1.6rem,5.5vw,3.2rem)] font-extrabold uppercase leading-none tracking-[0.06em] text-brand-700">
          {certificate.childName}
        </p>

        <p className="mt-4 text-[clamp(0.6rem,1.2vw,0.8rem)] font-semibold uppercase tracking-[0.2em] text-[#64688a]">
          {t("cert.forCompleting")}
        </p>
        <p className="mt-1 text-[clamp(0.85rem,2.2vw,1.3rem)] font-bold text-[#14152b]">{certificate.programme}</p>

        <div className="mt-5 flex items-center gap-6 text-[clamp(0.7rem,1.5vw,0.95rem)] font-bold text-[#14152b]">
          <span>⭐ {plural("plural.stars", certificate.stars)}</span>
          <span className="h-4 w-px bg-brand-200" aria-hidden />
          <span>⚡ {certificate.xp} XP</span>
        </div>

        <div className="mt-auto flex w-full items-end justify-between pt-6 text-left">
          <div>
            <p className="text-[clamp(0.55rem,1vw,0.7rem)] font-semibold text-[#9195b4]">
              {t("cert.issued", { date: formatDate(certificate.issuedAt, intlLocale) })}
            </p>
            <p className="text-[clamp(0.55rem,1vw,0.7rem)] font-semibold text-[#9195b4]">
              {t("cert.serial")} {certificate.serial}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-[clamp(0.8rem,1.8vw,1.1rem)] font-bold text-brand-700">KidsLearn</p>
            <p className="border-t border-[#d3d6e6] pt-1 text-[clamp(0.55rem,1vw,0.7rem)] font-semibold text-[#9195b4]">
              {t("cert.signature")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CertificateActions({
  certificate,
  onRerender,
  rerendering,
}: {
  certificate: CertificateDto;
  onRerender?: () => void;
  rerendering?: boolean;
}) {
  const t = useT();
  const pushToast = useAppStore((s) => s.pushToast);

  return (
    <div className="flex flex-wrap gap-2">
      {certificate.pdfUrl ? (
        <Button
          leadingIcon={<Download className="h-4 w-4" />}
          onClick={() => window.open(certificate.pdfUrl as string, "_blank", "noopener")}
        >
          {t("cert.download")}
        </Button>
      ) : certificate.status === "FAILED" && onRerender ? (
        <Button leadingIcon={<RefreshCw className="h-4 w-4" />} onClick={onRerender} loading={rerendering}>
          {t("cert.rerender")}
        </Button>
      ) : (
        <Button disabled leadingIcon={<Download className="h-4 w-4" />}>
          {t("cert.rendering")}
        </Button>
      )}
      <Button variant="secondary" leadingIcon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
        {t("cert.print")}
      </Button>
      <Button
        variant="secondary"
        leadingIcon={<Share2 className="h-4 w-4" />}
        onClick={async () => {
          const url = window.location.href;
          if (navigator.share) {
            await navigator.share({ title: certificate.title, url }).catch(() => undefined);
            return;
          }
          await navigator.clipboard.writeText(url).catch(() => undefined);
          pushToast({ title: t("cert.linkCopied"), tone: "mint", glyph: "🔗" });
        }}
      >
        {t("cert.share")}
      </Button>
    </div>
  );
}

export function CertificateTile({ certificate }: { certificate: CertificateDto }) {
  const { intlLocale } = useI18n();

  return (
    <Link
      href={`/certificates/${certificate.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-card"
    >
      <div className="overflow-hidden border-b border-border bg-surface-muted p-3">
        <CertificateSheet certificate={certificate} className="pointer-events-none shadow-none" />
      </div>
      <div className="p-4">
        <h3 className="t-h4 text-content">{certificate.title}</h3>
        <p className="t-caption mt-0.5 text-content-secondary">
          {certificate.childName} · {formatDate(certificate.issuedAt, intlLocale)}
        </p>
      </div>
    </Link>
  );
}
