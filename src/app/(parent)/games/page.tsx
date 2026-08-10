import type { Metadata } from "next";
import { GameLibraryView } from "@/features/catalog/library-view";

export const metadata: Metadata = { title: "Games" };

export default function GamesPage() {
  return <GameLibraryView />;
}
