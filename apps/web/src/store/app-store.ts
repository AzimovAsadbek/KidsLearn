"use client";

import { create } from "zustand";
import type { Tone } from "@/types";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: Tone;
  glyph?: string;
}

/**
 * Client-only UI state. Everything that describes *data* — children,
 * notifications, progress — lives on the server and is fetched through
 * TanStack Query; this store only remembers choices the UI itself makes.
 */
interface AppState {
  /* Selection ---------------------------------------------------------- */
  /** Sticky child choice; `null` until ChildProvider resolves the family. */
  selectedChildId: string | null;
  selectChild: (id: string) => void;

  /* Shell -------------------------------------------------------------- */
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (value: boolean) => void;
  toggleSidebar: () => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (value: boolean) => void;

  /* Child-facing preferences ------------------------------------------- */
  soundEnabled: boolean;
  toggleSound: () => void;

  /* Toasts ------------------------------------------------------------- */
  toasts: Toast[];
  pushToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
}

let toastSeq = 0;

export const useAppStore = create<AppState>((set, get) => ({
  selectedChildId: null,
  selectChild: (id) => set({ selectedChildId: id }),

  sidebarCollapsed: false,
  setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  mobileNavOpen: false,
  setMobileNavOpen: (value) => set({ mobileNavOpen: value }),

  soundEnabled: true,
  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),

  toasts: [],
  pushToast: (toast) => {
    toastSeq += 1;
    const id = `toast-${toastSeq}`;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    // Auto-dismiss; the toast viewport also renders a manual close control.
    setTimeout(() => get().dismissToast(id), 4200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
