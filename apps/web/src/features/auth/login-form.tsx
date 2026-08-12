"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useT } from "@/i18n/provider";
import { useSession } from "@/components/providers/session-provider";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { AuthFooterLink, AuthHeading, FormAlert } from "./auth-parts";

/**
 * Signs in against the real API. The seeded development account is prefilled so
 * a fresh checkout can be walked end-to-end without creating one first.
 */
export function LoginForm() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) nextErrors.email = "Enter a valid email address.";
    if (password.length < 6) nextErrors.password = t("auth.passwordMin6");
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const user = await signIn(email, password);
      // Honour ?next= when the guard bounced us here, otherwise send each role
      // to the surface it actually uses.
      const next = searchParams.get("next");
      router.replace(next && next.startsWith("/") ? next : user.role === "ADMIN" ? "/admin" : "/dashboard");
    } catch (error) {
      setLoading(false);
      if (error instanceof ApiError) {
        setFormError(error.message);
        if (error.details) {
          setErrors({ email: error.details.email?.[0], password: error.details.password?.[0] });
        }
        return;
      }
      setFormError("We couldn't reach the server. Check your connection and try again.");
    }
  }

  return (
    <div>
      <AuthHeading title={t("auth.welcomeBack")} subtitle={t("auth.loginSubtitle")} />

      {formError ? <FormAlert tone="danger">{formError}</FormAlert> : null}

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label={t("auth.email")} error={errors.email} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              leadingIcon={<Mail className="h-4 w-4" />}
            />
          )}
        </Field>

        <Field label={t("auth.password")} error={errors.password} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leadingIcon={<Lock className="h-4 w-4" />}
              trailingIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                  className="rounded-xs p-0.5 hover:text-content"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
          )}
        </Field>

        <div className="flex items-center justify-between gap-3">
          <Checkbox label={t("auth.keepSignedIn")} defaultChecked />
          <Link href="/forgot-password" className="t-body-sm font-semibold text-primary hover:underline">
            {t("auth.forgot")}
          </Link>
        </div>

        <Button type="submit" size="lg" fullWidth loading={loading}>
          {t("auth.signIn")}
        </Button>
      </form>

      <AuthFooterLink prompt={t("auth.noAccount")} href="/register" action={t("auth.signUp")} />
    </div>
  );
}
