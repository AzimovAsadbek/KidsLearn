import type { Metadata } from "next";
import { certificates } from "@/data/rewards";
import { PageHeading } from "@/components/layout/app-shell";
import { CertificateTile } from "@/features/certificates/certificate";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = { title: "Certificates" };

export default function CertificatesPage() {
  return (
    <div className="mx-auto w-full max-w-[90rem]">
      <PageHeading
        title="Certificates"
        subtitle="Every completed programme earns a printable certificate."
      />

      {certificates.length === 0 ? (
        <EmptyState
          glyph="📜"
          title="No certificates yet"
          body="Finish a programme and the first certificate appears here automatically."
        />
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
