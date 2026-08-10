"use client";

import { RouteError } from "@/components/layout/route-error";

export default function SegmentError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError {...props} />;
}
