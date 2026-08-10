import type { Metadata } from "next";
import { ChildProfileLoader } from "@/features/parent/child-profile-loader";

export const metadata: Metadata = { title: "Child profile" };

export default async function ChildProfilePage({ params }: PageProps<"/children/[id]">) {
  const { id } = await params;
  return <ChildProfileLoader childId={id} />;
}
