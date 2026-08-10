import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { children, childById } from "@/data/children";
import { ChildProfileView } from "@/features/parent/child-profile-view";

export function generateStaticParams() {
  return children.map((child) => ({ id: child.id }));
}

export async function generateMetadata({ params }: PageProps<"/children/[id]">): Promise<Metadata> {
  const { id } = await params;
  const child = childById.get(id);
  return { title: child ? `${child.name}'s profile` : "Child profile" };
}

export default async function ChildProfilePage({ params }: PageProps<"/children/[id]">) {
  const { id } = await params;
  const child = childById.get(id);
  if (!child) notFound();

  return <ChildProfileView child={child} />;
}
