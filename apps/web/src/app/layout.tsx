import type { Metadata, Viewport } from "next";
import { Baloo_2, Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "@/i18n/config";
import { I18nProvider } from "@/i18n/provider";
import { THEME_COOKIE, isThemePreference, themeInitScript } from "@/lib/theme";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastViewport } from "@/components/ui/toast";
import { InstallPrompt } from "@/components/platform/install-prompt";
import { ServiceWorkerRegistrar } from "@/components/platform/service-worker";

/** UI face — highly legible at small sizes and it carries tabular numerals. */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jakarta",
  display: "swap",
});

/** Display face — rounded and friendly, used for kid surfaces and the wordmark. */
const baloo = Baloo_2({
  subsets: ["latin", "latin-ext"],
  variable: "--font-baloo",
  display: "swap",
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "KidsLearn — Learning that feels like playing",
    template: "%s · KidsLearn",
  },
  description:
    "An interactive learning platform for children aged 1–7, with a parent dashboard, a playful child experience and a full content admin.",
  applicationName: "KidsLearn",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "KidsLearn" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0c1a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Reading preferences on the server means the first paint is already correct:
  // no flash of English, no flash of the wrong theme.
  const store = await cookies();
  const localeCookie = store.get(LOCALE_COOKIE)?.value;
  const themeCookie = store.get(THEME_COOKIE)?.value;
  const locale = isLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;
  const themePreference = isThemePreference(themeCookie) ? themeCookie : "system";

  return (
    <html lang={locale} className={`${jakarta.variable} ${baloo.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <ThemeProvider initialPreference={themePreference}>
          <I18nProvider initialLocale={locale}>
            <a href="#main" className="skip-link">
              Skip to content
            </a>
            {children}
            <ToastViewport />
            <InstallPrompt />
            <ServiceWorkerRegistrar />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
