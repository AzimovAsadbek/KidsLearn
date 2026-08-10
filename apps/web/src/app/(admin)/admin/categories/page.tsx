import type { Metadata } from "next";
import { CategoriesAdminView } from "@/features/admin/content-views";

export const metadata: Metadata = { title: "Categories" };

export default function Page() {
  return <CategoriesAdminView />;
}
