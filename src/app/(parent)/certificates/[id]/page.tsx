import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { certificates } from "@/data/rewards";
import { getChild } from "@/data/children";
import { CertificateActions, CertificateSheet } from "@/features/certificates/certificate";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export function generateStaticParams() {
  return certificates.map((certificate) => ({ id: certificate.id }));
}

export async function generateMetadata({ params }: PageProps<"/certificates/[id]">): Promise<Metadata> {
  const { id } = await params;
  const certificate = certificates.find((c) => c.id === id);
  return { title: certificate?.title ?? "Certificate" };
}

export default async function CertificatePage({ params }: PageProps<"/certificates/[id]">) {
  const { id } = await params;
  const certificate = certificates.find((c) => c.id === id);
  if (!certificate) notFound();

  const child = getChild(certificate.childId);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <Link
        href="/certificates"
        className="t-label no-print inline-flex items-center gap-1.5 text-content-secondary hover:text-content"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Certificates
      </Link>

      <CertificateSheet certificate={certificate} />

      <div className="no-print grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title={certificate.title} subtitle={certificate.programme} />
          <CardBody>
            <CertificateActions certificate={certificate} />
            <p className="t-caption mt-4 text-content-secondary">
              Printing uses your browser&apos;s &ldquo;Save as PDF&rdquo; option, so the certificate stays
              vector-sharp at any paper size.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Details" />
          <CardBody>
            <dl className="space-y-3">
              {[
                ["Awarded to", child.name],
                ["Programme", certificate.programme],
                ["Stars", `⭐ ${certificate.stars}`],
                ["Experience", `${certificate.xp} XP`],
                ["Serial", certificate.serial],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 border-b border-border pb-2.5 last:border-0 last:pb-0">
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
