import type { Metadata } from "next";
import { CertificatesListView } from "@/features/certificates/certificates-views";

export const metadata: Metadata = { title: "Certificates" };

export default function CertificatesPage() {
  return <CertificatesListView />;
}
