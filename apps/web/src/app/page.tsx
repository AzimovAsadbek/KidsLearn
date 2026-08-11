import type { Metadata } from "next";
import { LandingView } from "@/components/platform/landing-view";

export const metadata: Metadata = {
  title: "KidsLearn — Learning that feels like playing",
};

/**
 * Public entry point. One audience, one action: a parent creates the family
 * account. Children are profiles inside it and the admin studio is reached
 * through the quiet team link in the footer — neither needs a doorway here.
 */
export default function LandingPage() {
  return <LandingView />;
}
