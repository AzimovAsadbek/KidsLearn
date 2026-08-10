import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { gameById, games } from "@/data/games";
import { GameEngine } from "@/features/games/game-engine";

export function generateStaticParams() {
  return games.map((game) => ({ id: game.id }));
}

export async function generateMetadata({ params }: PageProps<"/kids/games/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: gameById.get(id)?.title ?? "Game" };
}

export default async function GamePage({ params }: PageProps<"/kids/games/[id]">) {
  const { id } = await params;
  const game = gameById.get(id);
  if (!game) notFound();

  return <GameEngine game={game} />;
}
