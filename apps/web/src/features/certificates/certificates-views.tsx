"use client";

import Link from "next/link";
import { useQueries, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useT } from "@/i18n/provider";
import { useChildContext } from "@/components/providers/child-provider";
import {
  fetchCertificate,
  fetchCertificates,
  queryKeys,
  rerenderCertificate,
} from "@/lib/api/queries";
import { ApiError } from "@/lib/api/client";
import { PageHeading } from "@/components/layout/app-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { CertificateActions, CertificateSheet, CertificateTile } from "./certificate";

/** Every certificate in the family, newest first. */
export function CertificatesListView() {
  const t = useT();
  const { children, loading } = useChildContext();

  const results = useQueries({
    queries: children.map((child) => ({
      queryKey: queryKeys.certificates(child.id),
      queryFn: () => fetchCertificates(child.id),
      enabled: !loading,
    })),
  });

  const isLoading = loading || results.some((r) => r.isLoading);
  const certificates = results
    .flatMap((r) => r.data ?? [])
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));

  return (
    <div className="mx-auto w-full max-w-[90rem]">
      <PageHeading title={t("nav.certificates")} subtitle={t("cert.listSubtitle")} />

      {isLoading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="shimmer aspect-[1.2/1] rounded-xl" />
          ))}
        </div>
      ) : certificates.length === 0 ? (
        <EmptyState glyph="📜" title={t("cert.emptyTitle")} body={t("cert.emptyBody")} />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {certificates.map((certificate) => (
            <CertificateTile key={certificate.id} certificate={certificate} />
          ))}
        </div>
      )}
    </div>
  );
}

/** One certificate: the sheet, real PDF download and detail rows. */
export function CertificateDetailView({ id }: { id: string }) {
  const t = useT();
  const queryClient = useQueryClient();

  const { data: certificate, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.certificate(id),
    queryFn: () => fetchCertificate(id),
  });

  const rerender = useMutation({
    mutationFn: () => rerenderCertificate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.certificate(id) }),
  });

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <div className="shimmer aspect-[1.414/1] rounded-xl" />
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <ErrorState
          title={error instanceof ApiError ? error.message : t("state.notFoundTitle")}
          body={t("state.notFoundBody")}
          action={<Button onClick={() => void refetch()}>{t("common.retry")}</Button>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <Link
        href="/certificates"
        className="t-label no-print inline-flex items-center gap-1.5 text-content-secondary hover:text-content"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("nav.certificates")}
      </Link>

      <CertificateSheet certificate={certificate} />

      <div className="no-print grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title={certificate.title} subtitle={certificate.programme} />
          <CardBody>
            <CertificateActions
              certificate={certificate}
              onRerender={() => rerender.mutate()}
              rerendering={rerender.isPending}
            />
            <p className="t-caption mt-4 text-content-secondary">{t("cert.printHint")}</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("cert.details")} />
          <CardBody>
            <dl className="space-y-3">
              {(
                [
                  [t("cert.awardedTo"), certificate.childName],
                  [t("cert.programme"), certificate.programme],
                  [t("common.stars"), `⭐ ${certificate.stars}`],
                  [t("common.xp"), `${certificate.xp} XP`],
                  [t("cert.serial"), certificate.serial],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 border-b border-border pb-2.5 last:border-0 last:pb-0"
                >
                  <dt className="t-body-sm text-content-secondary">{label}</dt>
                  <dd className="t-body-sm font-semibold text-content">{value}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
