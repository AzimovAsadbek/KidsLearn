import type { Metadata } from "next";
import { KidProfileView } from "@/features/child/kid-profile";

export const metadata: Metadata = { title: "My profile" };

export default function KidProfilePage() {
  return <KidProfileView />;
}
