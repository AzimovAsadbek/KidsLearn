import type { Metadata } from "next";
import { KidHome } from "@/features/child/kid-home";

export const metadata: Metadata = { title: "Home" };

export default function KidHomePage() {
  return <KidHome />;
}
