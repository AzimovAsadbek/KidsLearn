import type { Metadata } from "next";
import { GamesAdminView } from "@/features/admin/content-views";

export const metadata: Metadata = { title: "Games" };

export default function Page() {
  return <GamesAdminView />;
}
