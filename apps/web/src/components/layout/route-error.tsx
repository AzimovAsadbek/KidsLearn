"use client";

import { RotateCw } from "lucide-react";
import { useT } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";

/**
 * Shared route-level error UI. Every segment mounts this so a failure inside one
 * area keeps the shell, the navigation and the theme intact.
 */
export function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();

  return (
    <div className="mx-auto w-full max-w-2xl py-10">
      <ErrorState
        title={t("state.errorTitle")}
        body={t("state.errorBody")}
        action={
          <Button onClick={reset} leadingIcon={<RotateCw className="h-4 w-4" />}>
            {t("common.retry")}
          </Button>
        }
      />
      {error.digest ? (
        <p className="t-caption mt-4 text-center text-content-tertiary">Reference: {error.digest}</p>
      ) : null}
    </div>
  );
}
