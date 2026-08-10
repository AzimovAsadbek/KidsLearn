"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ChildDto } from "@kidslearn/types";
import { fetchChildren, queryKeys } from "@/lib/api/queries";
import { useAppStore } from "@/store/app-store";
import { useSession } from "./session-provider";

interface ChildContextValue {
  children: ChildDto[];
  selectedChild: ChildDto | null;
  selectedChildId: string | null;
  selectChild: (id: string) => void;
  loading: boolean;
  error: Error | null;
}

const ChildContext = createContext<ChildContextValue | null>(null);

/**
 * Owns "which child are we looking at".
 *
 * The id is mirrored into the URL (`?child=`) so a dashboard link can be shared
 * or reloaded and still show the same child, while the store keeps the choice
 * sticky as the parent moves between pages.
 */
export function ChildProvider({ children: content }: { children: ReactNode }) {
  const { isAuthenticated } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedChildId = useAppStore((s) => s.selectedChildId);
  const selectChildInStore = useAppStore((s) => s.selectChild);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.children,
    queryFn: fetchChildren,
    enabled: isAuthenticated,
  });

  const list = useMemo(() => data ?? [], [data]);
  const urlChildId = searchParams.get("child");

  // Resolve the active child: the URL wins, then the sticky choice, then the
  // first child. An id that no longer exists falls back rather than 404ing.
  const resolvedId = useMemo(() => {
    if (list.length === 0) return null;
    const candidates = [urlChildId, selectedChildId];
    for (const candidate of candidates) {
      if (candidate && list.some((child) => child.id === candidate)) return candidate;
    }
    return list[0].id;
  }, [list, urlChildId, selectedChildId]);

  useEffect(() => {
    if (resolvedId && resolvedId !== selectedChildId) selectChildInStore(resolvedId);
  }, [resolvedId, selectedChildId, selectChildInStore]);

  const value = useMemo<ChildContextValue>(
    () => ({
      children: list,
      selectedChild: list.find((child) => child.id === resolvedId) ?? null,
      selectedChildId: resolvedId,
      selectChild: (id: string) => {
        selectChildInStore(id);
        // Replace, not push: switching child should not fill the back stack.
        const params = new URLSearchParams(searchParams.toString());
        params.set("child", id);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      },
      loading: isLoading,
      error: (error as Error) ?? null,
    }),
    [list, resolvedId, selectChildInStore, searchParams, router, pathname, isLoading, error],
  );

  return <ChildContext.Provider value={value}>{content}</ChildContext.Provider>;
}

export function useChildContext(): ChildContextValue {
  const ctx = useContext(ChildContext);
  if (!ctx) {
    throw new Error("useChildContext must be used inside <ChildProvider>");
  }
  return ctx;
}

/** Convenience for the many screens that only need the active child's id. */
export function useSelectedChild() {
  const { selectedChild, selectedChildId, loading } = useChildContext();
  return { child: selectedChild, childId: selectedChildId, loading };
}
