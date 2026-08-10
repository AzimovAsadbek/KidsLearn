import type { Metadata } from "next";
import { CertificatesAdminView } from "@/features/admin/engagement-views";

export const metadata: Metadata = { title: "Certificates" };

export default function Page() {
  return <CertificatesAdminView />;
}
