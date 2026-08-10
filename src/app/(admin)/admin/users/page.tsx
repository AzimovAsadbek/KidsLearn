import type { Metadata } from "next";
import { UsersAdminView } from "@/features/admin/people-views";

export const metadata: Metadata = { title: "Users" };

export default function Page() {
  return <UsersAdminView />;
}
