"use client";

import { KidRouteError } from "@/components/kid/kid-error";

export default function SegmentError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <KidRouteError {...props} />;
}
