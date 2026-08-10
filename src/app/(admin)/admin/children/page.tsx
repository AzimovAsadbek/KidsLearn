import type { Metadata } from "next";
import { ChildrenAdminView } from "@/features/admin/people-views";

export const metadata: Metadata = { title: "Children" };

export default function Page() {
  return <ChildrenAdminView />;
}
