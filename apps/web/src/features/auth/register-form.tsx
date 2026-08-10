"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, User } from "lucide-react";
import { useT } from "@/i18n/provider";
import { useSession } from "@/components/providers/session-provider";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { AuthFooterLink, AuthHeading, FormAlert, PasswordStrength, SocialRow } from "./auth-parts";

export function RegisterForm() {
  const t = useT();
  const router = useRouter();
  const { register } = useSession();
  const [formError, setFormError] = useState<string | null>(null);

  const [values, setValues] = useState({ name: "", email: "", password: "", confirm: "" });
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof values | "terms", string>>>({});
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof values>(key: K, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: typeof errors = {};
    if (values.name.trim().length < 2) next.name = "Please tell us your name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) next.email = "Enter a valid email address.";
    if (values.password.length < 8) next.password = "Use at least 8 characters.";
    if (values.confirm !== values.password) next.confirm = "Passwords don't match.";
    if (!accepted) next.terms = "Please accept the terms to continue.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    setFormError(null);
    try {
      await register({ name: values.name, email: values.email, password: values.password });
      // A fresh account has no children yet, so onboarding starts on "add child".
      router.replace("/children?add=1&welcome=1");
    } catch (error) {
      setLoading(false);
      if (error instanceof ApiError) {
        if (error.code === "EMAIL_TAKEN") {
          setErrors({ email: "An account with that email already exists." });
          return;
        }
        if (error.details) {
          setErrors({
            name: error.details.name?.[0],
            email: error.details.email?.[0],
            password: error.details.password?.[0],
          });
          return;
        }
        setFormError(error.message);
        return;
      }
      setFormError("We couldn't reach the server. Check your connection and try again.");
    }
  }

  return (
    <div>
      <AuthHeading title={t("auth.createTitle")} subtitle={t("auth.createSubtitle")} />

      {formError ? <FormAlert tone="danger">{formError}</FormAlert> : null}

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label={t("auth.fullName")} error={errors.name} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              autoComplete="name"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Asadbek Azimov"
              leadingIcon={<User className="h-4 w-4" />}
            />
          )}
        </Field>

        <Field label={t("auth.email")} error={errors.email} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="you@example.com"
              leadingIcon={<Mail className="h-4 w-4" />}
            />
          )}
        </Field>

        <Field label={t("auth.password")} error={errors.password} required>
          {({ id, describedBy, invalid }) => (
            <div>
              <Input
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                type="password"
                autoComplete="new-password"
                value={values.password}
                onChange={(e) => set("password", e.target.value)}
                leadingIcon={<Lock className="h-4 w-4" />}
              />
              <PasswordStrength value={values.password} />
            </div>
          )}
        </Field>

        <Field label={t("auth.confirmPassword")} error={errors.confirm} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              type="password"
              autoComplete="new-password"
              value={values.confirm}
              onChange={(e) => set("confirm", e.target.value)}
              leadingIcon={<Lock className="h-4 w-4" />}
            />
          )}
        </Field>

        <div>
          <Checkbox
            label={t("auth.terms")}
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          {errors.terms ? (
            <p role="alert" className="t-caption mt-1.5 font-medium text-danger">
              {errors.terms}
            </p>
          ) : null}
        </div>

        <Button type="submit" size="lg" fullWidth loading={loading}>
          {t("auth.signUp")}
        </Button>
      </form>

      <SocialRow label={t("auth.orContinue")} />
      <AuthFooterLink prompt={t("auth.hasAccount")} href="/login" action={t("auth.signIn")} />
    </div>
  );
}
