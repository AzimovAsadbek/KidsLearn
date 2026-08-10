"use client";

import { create } from "zustand";
import type { AppNotification, GameResult, Tone } from "@/types";
import { notifications as seedNotifications } from "@/data/notifications";
import { children as seedChildren } from "@/data/children";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: Tone;
  glyph?: string;
}

/** XP/stars a child has earned inside this browser session, layered over seed data. */
export interface SessionGains {
  xp: number;
  stars: number;
  lessonsCompleted: number;
  gamesPlayed: number;
  minutes: number;
}

const emptyGains: SessionGains = { xp: 0, stars: 0, lessonsCompleted: 0, gamesPlayed: 0, minutes: 0 };

interface AppState {
  /* Selection ---------------------------------------------------------- */
  selectedChildId: string;
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

  /* Notifications ------------------------------------------------------ */
  notifications: AppNotification[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  removeNotification: (id: string) => void;

  /* Toasts ------------------------------------------------------------- */
  toasts: Toast[];
  pushToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;

  /* Live progress ------------------------------------------------------ */
  gains: Record<string, SessionGains>;
  completedLessonIds: string[];
  completeLesson: (childId: string, lessonId: string, xp: number, stars: number, minutes: number) => void;
  recordGameResult: (childId: string, result: GameResult) => void;
  resetSession: () => void;
}

let toastSeq = 0;

export const useAppStore = create<AppState>((set, get) => ({
  selectedChildId: seedChildren[0]?.id ?? "",
  selectChild: (id) => set({ selectedChildId: id }),

  sidebarCollapsed: false,
  setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  mobileNavOpen: false,
  setMobileNavOpen: (value) => set({ mobileNavOpen: value }),

  soundEnabled: true,
  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),

  notifications: seedNotifications,
  markNotificationRead: (id) =>
    set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
  markAllNotificationsRead: () =>
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
  removeNotification: (id) => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

  toasts: [],
  pushToast: (toast) => {
    toastSeq += 1;
    const id = `toast-${toastSeq}`;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    // Auto-dismiss; the toast viewport also renders a manual close control.
    setTimeout(() => get().dismissToast(id), 4200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  gains: {},
  completedLessonIds: [],
  completeLesson: (childId, lessonId, xp, stars, minutes) =>
    set((s) => {
      const current = s.gains[childId] ?? emptyGains;
      return {
        completedLessonIds: s.completedLessonIds.includes(lessonId)
          ? s.completedLessonIds
          : [...s.completedLessonIds, lessonId],
        gains: {
          ...s.gains,
          [childId]: {
            ...current,
            xp: current.xp + xp,
            stars: current.stars + stars,
            lessonsCompleted: current.lessonsCompleted + 1,
            minutes: current.minutes + minutes,
          },
        },
      };
    }),
  recordGameResult: (childId, result) =>
    set((s) => {
      const current = s.gains[childId] ?? emptyGains;
      return {
        gains: {
          ...s.gains,
          [childId]: {
            ...current,
            xp: current.xp + result.xp,
            stars: current.stars + result.stars,
            gamesPlayed: current.gamesPlayed + 1,
            minutes: current.minutes + Math.round(result.durationSeconds / 60),
          },
        },
      };
    }),
  resetSession: () => set({ gains: {}, completedLessonIds: [] }),
}));

/** Session gains for one child, or a zeroed record. Stable identity for selectors. */
export function useGains(childId: string): SessionGains {
  return useAppStore((s) => s.gains[childId]) ?? emptyGains;
}

export function useUnreadCount(): number {
  return useAppStore((s) => s.notifications.reduce((total, n) => total + (n.read ? 0 : 1), 0));
}
