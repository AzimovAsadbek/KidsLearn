import type { ThemePreference } from "@/types";

export const THEME_COOKIE = "kl-theme";

export function isThemePreference(value: string | undefined): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

/**
 * Runs before first paint so the correct surface stack is already applied — a
 * flash of the wrong theme is the single most noticeable dark-mode defect.
 * Kept dependency-free and inlined into <head>.
 */
export const themeInitScript = `(function(){try{
var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);
var p=m?decodeURIComponent(m[1]):'system';
var dark=p==='dark'||(p!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.classList.toggle('dark',dark);
document.documentElement.style.colorScheme=dark?'dark':'light';
}catch(e){}})();`;
