import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  Cog,
  FileBadge,
  Gamepad2,
  GraduationCap,
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  Medal,
  Palette,
  PlayCircle,
  Puzzle,
  ScrollText,
  Shapes,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  UserCog,
  Users,
  Users2,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TranslationKey } from "@/i18n/config";
import type { Tone } from "@/lib/tone";

export interface NavItem {
  href: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
  /** Live count rendered as a bubble (notifications). */
  badgeKey?: "notifications";
  /** Marks routes that should only match exactly, not by prefix. */
  exact?: boolean;
}

export interface NavGroup {
  titleKey?: TranslationKey;
  items: NavItem[];
}

/* --- Parent ------------------------------------------------------------- */

export const parentNav: NavGroup[] = [
  {
    titleKey: "nav.parent",
    items: [
      { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, exact: true },
      { href: "/children", labelKey: "nav.myChildren", icon: Users2 },
      { href: "/lessons", labelKey: "nav.lessons", icon: BookOpen },
      { href: "/games", labelKey: "nav.games", icon: Gamepad2 },
      { href: "/progress", labelKey: "nav.progress", icon: TrendingUp },
      { href: "/statistics", labelKey: "nav.statistics", icon: BarChart3 },
    ],
  },
  {
    titleKey: "nav.engagement",
    items: [
      { href: "/achievements", labelKey: "nav.achievements", icon: Trophy },
      { href: "/rewards", labelKey: "nav.rewards", icon: Medal },
      { href: "/leaderboard", labelKey: "nav.leaderboard", icon: Award },
      { href: "/certificates", labelKey: "nav.certificates", icon: FileBadge },
      { href: "/notifications", labelKey: "nav.notifications", icon: Bell, badgeKey: "notifications" },
      { href: "/settings", labelKey: "nav.settings", icon: Cog },
    ],
  },
];

/** Bottom bar on phones — five destinations is the practical maximum. */
export const parentMobileNav: NavItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, exact: true },
  { href: "/children", labelKey: "nav.myChildren", icon: Users2 },
  { href: "/progress", labelKey: "nav.progress", icon: TrendingUp },
  { href: "/achievements", labelKey: "nav.achievements", icon: Trophy },
  { href: "/settings", labelKey: "nav.settings", icon: Cog },
];

/* --- Admin -------------------------------------------------------------- */

export const adminNav: NavGroup[] = [
  {
    titleKey: "nav.admin",
    items: [{ href: "/admin", labelKey: "nav.dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    titleKey: "nav.people",
    items: [
      { href: "/admin/users", labelKey: "nav.users", icon: Users },
      { href: "/admin/parents", labelKey: "nav.parents", icon: UserCog },
      { href: "/admin/children", labelKey: "nav.children", icon: GraduationCap },
    ],
  },
  {
    titleKey: "nav.content",
    items: [
      { href: "/admin/lessons", labelKey: "nav.lessons", icon: BookOpen },
      { href: "/admin/games", labelKey: "nav.games", icon: Gamepad2 },
      { href: "/admin/subjects", labelKey: "nav.subjects", icon: Shapes },
      { href: "/admin/categories", labelKey: "nav.categories", icon: Boxes },
      { href: "/admin/media", labelKey: "nav.media", icon: ImageIcon },
      { href: "/admin/ai-generator", labelKey: "nav.aiGenerator", icon: Sparkles },
    ],
  },
  {
    titleKey: "nav.engagement",
    items: [
      { href: "/admin/achievements", labelKey: "nav.achievements", icon: Trophy },
      { href: "/admin/rewards", labelKey: "nav.rewards", icon: Medal },
      { href: "/admin/notifications", labelKey: "nav.notifications", icon: Bell },
      { href: "/admin/leaderboard", labelKey: "nav.leaderboard", icon: Award },
      { href: "/admin/certificates", labelKey: "nav.certificates", icon: ScrollText },
    ],
  },
  {
    titleKey: "nav.platform",
    items: [
      { href: "/admin/statistics", labelKey: "nav.statistics", icon: BarChart3 },
      { href: "/admin/settings", labelKey: "nav.settings", icon: Cog },
    ],
  },
];

/* --- Child -------------------------------------------------------------- */

export interface KidNavItem {
  href: string;
  labelKey: TranslationKey;
  glyph: string;
  icon: LucideIcon;
  tone: Tone;
}

export const kidNav: KidNavItem[] = [
  { href: "/kids/lessons", labelKey: "nav.lessons", glyph: "📚", icon: BookOpen, tone: "sky" },
  { href: "/kids/games", labelKey: "nav.games", glyph: "🎮", icon: Puzzle, tone: "mint" },
  { href: "/kids/books", labelKey: "nav.books", glyph: "📖", icon: BookOpen, tone: "grape" },
  { href: "/kids/videos", labelKey: "nav.videos", glyph: "🎬", icon: Video, tone: "coral" },
  { href: "/kids/activities", labelKey: "nav.activities", glyph: "🎨", icon: Palette, tone: "sun" },
];

export const kidBottomNav: KidNavItem[] = [
  { href: "/kids", labelKey: "nav.home", glyph: "🏠", icon: Home, tone: "brand" },
  { href: "/kids/lessons", labelKey: "nav.lessons", glyph: "📚", icon: BookOpen, tone: "sky" },
  { href: "/kids/games", labelKey: "nav.games", glyph: "🎮", icon: Gamepad2, tone: "mint" },
  { href: "/kids/rewards", labelKey: "kid.myRewards", glyph: "🏆", icon: Star, tone: "sun" },
  { href: "/kids/profile", labelKey: "kid.myProfile", glyph: "🙂", icon: PlayCircle, tone: "blossom" },
];

/** Prefix-aware active check shared by every navigation surface. */
export function isNavActive(pathname: string, item: { href: string; exact?: boolean }): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
