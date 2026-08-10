"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchGame, queryKeys } from "@/lib/api/queries";
import { ApiError } from "@/lib/api/client";
import { KidLoading } from "@/components/kid/kid-loading";
import { KidRouteError } from "@/components/kid/kid-error";
import { GameEngine } from "./game-engine";

/**
 * Loads the game definition, then hands off to the engine. The engine deals its
 * own session, so this only has to resolve the catalogue entry.
 */
export function GamePlayer({ idOrSlug }: { idOrSlug: string }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.game(idOrSlug),
    queryFn: () => fetchGame(idOrSlug),
  });

  if (isLoading) return <KidLoading message="Getting the game ready…" />;

  if (error || !data) {
    return (
      <KidRouteError
        error={error instanceof ApiError ? error : new Error("Game not found")}
        reset={() => void refetch()}
      />
    );
  }

  return <GameEngine game={data} />;
}
