import type { Metadata } from "next";
import { CertificateDetailView } from "@/features/certificates/certificates-views";

export const metadata: Metadata = { title: "Certificate" };

export default async function CertificatePage({ params }: PageProps<"/certificates/[id]">) {
  const { id } = await params;
  return <CertificateDetailView id={id} />;
}
