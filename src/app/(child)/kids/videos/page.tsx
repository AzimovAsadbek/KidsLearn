import type { Metadata } from "next";
import { KidVideosView } from "@/features/child/kid-library";

export const metadata: Metadata = { title: "Videos" };

export default function KidVideosPage() {
  return <KidVideosView />;
}
