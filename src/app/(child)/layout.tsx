import { KidShell } from "@/components/kid/kid-shell";

export default function ChildLayout({ children }: LayoutProps<"/">) {
  return <KidShell>{children}</KidShell>;
}
