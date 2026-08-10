import type { Metadata } from "next";
import { AiGeneratorView } from "@/features/admin/ai-generator";

export const metadata: Metadata = { title: "AI generator" };

export default function Page() {
  return <AiGeneratorView />;
}
