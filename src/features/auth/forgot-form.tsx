"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { useT } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { AuthHeading, FormAlert } from "./auth-parts";

export function ForgotForm() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(undefined);
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-success-soft text-5xl" aria-hidden>
          📬
        </div>
        <h1 className="t-h1 mt-5 text-content">Check your inbox</h1>
        <p className="t-body mt-2 text-balance text-content-secondary">
          If an account exists for <strong className="text-content">{email}</strong>, a reset link is on
          its way. It expires in 30 minutes.
        </p>
        <Button
          variant="secondary"
          size="lg"
          className="mt-7"
          fullWidth
          onClick={() => {
            setSent(false);
            setEmail("");
          }}
        >
          Use a different address
        </Button>
        <Link
          href="/login"
          className="t-body-sm mt-4 inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <AuthHeading title={t("auth.forgotTitle")} subtitle={t("auth.forgotSubtitle")} />

      <FormAlert tone="success">
        We never email children directly. Reset links only go to the parent account.
      </FormAlert>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label={t("auth.email")} error={error} required>
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

        <Button type="submit" size="lg" fullWidth loading={loading}>
          {t("auth.sendLink")}
        </Button>
      </form>

      <Link
        href="/login"
        className="t-body-sm mt-6 flex items-center justify-center gap-1.5 font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to sign in
      </Link>
    </div>
  );
}
