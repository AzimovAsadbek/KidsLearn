import type { Metadata } from "next";
import { LessonsAdminView } from "@/features/admin/content-views";

export const metadata: Metadata = { title: "Lessons" };

export default function Page() {
  return <LessonsAdminView />;
}
