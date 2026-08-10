"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useT } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { AuthFooterLink, AuthHeading, FormAlert, SocialRow } from "./auth-parts";

/**
 * Demo credentials are prefilled so the flow can be walked end-to-end. Typing
 * an address containing "fail" exercises the error state.
 */
export function LoginForm() {
  const t = useT();
  const router = useRouter();

  const [email, setEmail] = useState("asadbek@kidslearn.app");
  const [password, setPassword] = useState("kidslearn");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) nextErrors.email = "Enter a valid email address.";
    if (password.length < 6) nextErrors.password = "Passwords are at least 6 characters.";
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 750));

    if (email.includes("fail")) {
      setLoading(false);
      setFormError("We couldn't find an account with those details.");
      return;
    }
    router.push("/dashboard");
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
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="rounded-xs p-0.5 hover:text-content"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
          )}
        </Field>

        <div className="flex items-center justify-between gap-3">
          <Checkbox label="Keep me signed in" defaultChecked />
          <Link href="/forgot-password" className="t-body-sm font-semibold text-primary hover:underline">
            {t("auth.forgot")}
          </Link>
        </div>

        <Button type="submit" size="lg" fullWidth loading={loading}>
          {t("auth.signIn")}
        </Button>
      </form>

      <SocialRow label={t("auth.orContinue")} />
      <AuthFooterLink prompt={t("auth.noAccount")} href="/register" action={t("auth.signUp")} />
    </div>
  );
}
