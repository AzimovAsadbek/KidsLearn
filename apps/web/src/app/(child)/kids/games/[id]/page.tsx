import type { Metadata } from "next";
import { GamePlayer } from "@/features/games/game-player";

export const metadata: Metadata = { title: "Game" };

export default async function GamePage({ params }: PageProps<"/kids/games/[id]">) {
  const { id } = await params;
  return <GamePlayer idOrSlug={id} />;
}
