import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/login-form";
import { Skeleton } from "@/components/ui/states";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    // The form reads ?next= to return people where the guard interrupted them.
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
