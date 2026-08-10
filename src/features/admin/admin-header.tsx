"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useT } from "@/i18n/provider";
import { adminNav } from "@/config/navigation";

/**
 * Breadcrumbs derived from the nav config, so a new admin section gets its trail
 * for free instead of hard-coding a label per page.
 */
export function AdminHeaderSlot() {
  const pathname = usePathname();
  const t = useT();

  const item = adminNav.flatMap((group) => group.items).find((entry) => entry.href === pathname);
  const group = adminNav.find((g) => g.items.some((entry) => entry.href === pathname));

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1.5">
        <li>
          <Link href="/admin" className="t-body-sm font-semibold text-content-secondary hover:text-content">
            {t("nav.admin")}
          </Link>
        </li>
        {group?.titleKey && group.titleKey !== "nav.admin" ? (
          <>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-content-tertiary" aria-hidden />
            <li className="t-body-sm hidden font-semibold text-content-secondary sm:block">
              {t(group.titleKey)}
            </li>
          </>
        ) : null}
        {item && item.href !== "/admin" ? (
          <>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-content-tertiary" aria-hidden />
            <li className="t-body-sm min-w-0 truncate font-bold text-content" aria-current="page">
              {t(item.labelKey)}
            </li>
          </>
        ) : null}
      </ol>
    </nav>
  );
}
