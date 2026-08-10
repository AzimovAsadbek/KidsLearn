import type { Metadata } from "next";
import { KidGamesView } from "@/features/child/kid-library";

export const metadata: Metadata = { title: "Games" };

export default function KidGamesPage() {
  return <KidGamesView />;
}
