import type { Metadata } from "next";
import { SubjectsAdminView } from "@/features/admin/content-views";

export const metadata: Metadata = { title: "Subjects" };

export default function Page() {
  return <SubjectsAdminView />;
}
