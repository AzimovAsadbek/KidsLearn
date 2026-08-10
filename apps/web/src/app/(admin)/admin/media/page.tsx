import type { Metadata } from "next";
import { MediaLibraryView } from "@/features/admin/media-library";

export const metadata: Metadata = { title: "Media library" };

export default function Page() {
  return <MediaLibraryView />;
}
