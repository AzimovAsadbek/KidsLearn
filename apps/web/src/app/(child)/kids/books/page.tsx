import type { Metadata } from "next";
import { KidBooksView } from "@/features/child/kid-library";

export const metadata: Metadata = { title: "Books" };

export default function KidBooksPage() {
  return <KidBooksView />;
}
