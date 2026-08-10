"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Monitor, Moon, ShieldCheck, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneStyles } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import { LOCALES } from "@/i18n/config";
import type { Locale, ThemePreference } from "@/types";
import type { ChildDto } from "@kidslearn/types";
import { useTheme } from "@/components/providers/theme-provider";
import { useSession } from "@/components/providers/session-provider";
import { useChildContext } from "@/components/providers/child-provider";
import { useAppStore } from "@/store/app-store";
import { avatarChoices } from "@/config/avatars";
import {
  changePassword,
  fetchParentSettings,
  queryKeys,
  setParentPin,
  updateChild,
  updateParentSettings,
  updateProfile,
} from "@/lib/api/queries";
import { ApiError } from "@/lib/api/client";
import { PageHeading } from "@/components/layout/app-shell";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Switch } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

type Section = "profile" | "security" | "notifications" | "language" | "appearance" | "children" | "privacy";

export function SettingsView() {
  const t = useT();
  const [section, setSection] = useState<Section>("profile");

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <PageHeading title={t("nav.settings")} subtitle={t("settings.subtitle")} />

      <Tabs
        variant="pill"
        ariaLabel={t("settings.sections")}
        value={section}
        onChange={setSection}
        items={[
          { id: "profile", label: t("settings.tabProfile") },
          { id: "security", label: t("settings.tabSecurity") },
          { id: "notifications", label: t("nav.notifications") },
          { id: "language", label: t("common.language") },
          { id: "appearance", label: t("settings.tabAppearance") },
          { id: "children", label: t("nav.children") },
          { id: "privacy", label: t("settings.tabPrivacy") },
        ]}
      />

      {section === "profile" ? <ProfileSection /> : null}
      {section === "security" ? <SecuritySection /> : null}
      {section === "notifications" ? <NotificationSettings /> : null}
      {section === "language" ? <LanguageSection /> : null}
      {section === "appearance" ? <AppearanceSection /> : null}
      {section === "children" ? <ChildrenSettings /> : null}
      {section === "privacy" ? <PrivacySection /> : null}
    </div>
  );
}

function useSettingsToast() {
  const t = useT();
  const pushToast = useAppStore((s) => s.pushToast);
  return {
    saved: () => pushToast({ title: t("settings.saved"), tone: "mint", glyph: "✅" }),
    failed: (error?: unknown) =>
      pushToast({
        title: error instanceof ApiError ? error.message : t("state.errorTitle"),
        tone: "coral",
        glyph: "⚠️",
      }),
  };
}

/** Name, phone and avatar — persisted through PATCH /auth/profile. */
function ProfileSection() {
  const t = useT();
  const { user, refresh } = useSession();
  const toast = useSettingsToast();

  // Local edits overlay the session user; `null` means "not touched yet", so
  // a background session refresh never clobbers what the parent is typing.
  const [nameEdit, setNameEdit] = useState<string | null>(null);
  const [phoneEdit, setPhoneEdit] = useState<string | null>(null);
  const [glyphEdit, setGlyphEdit] = useState<string | null>(null);

  const name = nameEdit ?? user?.name ?? "";
  const phone = phoneEdit ?? user?.phone ?? "";
  const avatarGlyph = glyphEdit ?? user?.avatarGlyph ?? avatarChoices[0].glyph;

  const save = useMutation({
    mutationFn: () =>
      updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
        avatarGlyph,
      }),
    onSuccess: async () => {
      await refresh();
      setNameEdit(null);
      setPhoneEdit(null);
      setGlyphEdit(null);
      toast.saved();
    },
    onError: toast.failed,
  });

  if (!user) return null;

  return (
    <Card>
      <CardHeader title={t("settings.profileTitle")} subtitle={t("settings.profileSubtitle")} />
      <CardBody className="space-y-5">
        <fieldset>
          <legend className="t-label mb-3 text-content">{t("parent.pickAvatar")}</legend>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
            {avatarChoices.map((choice, index) => {
              const selected = choice.glyph === avatarGlyph;
              return (
                <button
                  key={`${choice.glyph}-${index}`}
                  type="button"
                  onClick={() => setGlyphEdit(choice.glyph)}
                  aria-pressed={selected}
                  aria-label={t("parent.avatarNumber", { number: index + 1 })}
                  className={cn(
                    "relative grid aspect-square place-items-center rounded-lg border-2 text-2xl transition-colors",
                    toneStyles[choice.tone].soft,
                    selected ? "border-primary" : "border-transparent hover:border-border-strong",
                  )}
                >
                  <span aria-hidden>{choice.glyph}</span>
                  {selected ? (
                    <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-on">
                      <Check className="h-3 w-3" aria-hidden />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("auth.fullName")}>
            {({ id }) => <Input id={id} value={name} onChange={(e) => setNameEdit(e.target.value)} />}
          </Field>
          <Field label={t("auth.email")} hint={t("settings.emailLocked")}>
            {({ id }) => <Input id={id} type="email" value={user.email} disabled readOnly />}
          </Field>
          <Field label={t("settings.phone")}>
            {({ id }) => <Input id={id} type="tel" value={phone} onChange={(e) => setPhoneEdit(e.target.value)} />}
          </Field>
        </div>
      </CardBody>
      <CardFooter className="justify-end">
        <Button onClick={() => save.mutate()} loading={save.isPending} disabled={name.trim().length < 2}>
          {t("common.save")}
        </Button>
      </CardFooter>
    </Card>
  );
}

/** Password change and the kid-mode PIN — both real endpoints. */
function SecuritySection() {
  const t = useT();
  const toast = useSettingsToast();
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: queryKeys.parentSettings, queryFn: fetchParentSettings });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const savePassword = useMutation({
    mutationFn: () => changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.saved();
    },
    onError: (error) => {
      setPasswordError(error instanceof ApiError ? error.message : t("state.errorTitle"));
    },
  });

  function submitPassword() {
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError(t("settings.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("settings.passwordMismatch"));
      return;
    }
    savePassword.mutate();
  }

  const [pin, setPin] = useState("");
  const savePin = useMutation({
    mutationFn: () => setParentPin(pin),
    onSuccess: async () => {
      setPin("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.parentSettings });
      toast.saved();
    },
    onError: toast.failed,
  });

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title={t("settings.passwordTitle")} subtitle={t("settings.passwordSubtitle")} />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label={t("settings.currentPassword")}>
            {({ id }) => (
              <Input
                id={id}
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            )}
          </Field>
          <span className="hidden sm:block" />
          <Field label={t("settings.newPassword")}>
            {({ id }) => (
              <Input
                id={id}
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            )}
          </Field>
          <Field label={t("settings.confirmNewPassword")} error={passwordError ?? undefined}>
            {({ id, invalid, describedBy }) => (
              <Input
                id={id}
                type="password"
                autoComplete="new-password"
                aria-describedby={describedBy}
                invalid={invalid}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            )}
          </Field>
        </CardBody>
        <CardFooter className="justify-end">
          <Button
            onClick={submitPassword}
            loading={savePassword.isPending}
            disabled={!currentPassword || !newPassword || !confirmPassword}
          >
            {t("common.save")}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader
          title={t("settings.pinTitle")}
          subtitle={settings.data?.hasPin ? t("settings.pinSetSubtitle") : t("settings.pinUnsetSubtitle")}
        />
        <CardBody>
          <div className="rounded-lg border border-border bg-surface-muted p-4">
            <p className="t-label flex items-center gap-2 text-content">
              <ShieldCheck
                className={cn("h-4 w-4", settings.data?.hasPin ? "text-success" : "text-content-tertiary")}
                aria-hidden
              />
              {t("settings.pinLabel")}
              {settings.data?.hasPin ? (
                <Badge tone="mint" size="sm">
                  {t("settings.pinActive")}
                </Badge>
              ) : null}
            </p>
            <p className="t-caption mt-1 text-content-secondary">{t("settings.pinHint")}</p>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <Field label={settings.data?.hasPin ? t("settings.pinChange") : t("settings.pinSet")}>
                {({ id }) => (
                  <Input
                    id={id}
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={8}
                    className="w-36 tracking-[0.4em]"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  />
                )}
              </Field>
              <Button
                variant="secondary"
                onClick={() => savePin.mutate()}
                loading={savePin.isPending}
                disabled={pin.length < 4}
              >
                {t("common.save")}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

const TIMEZONES = [
  "Asia/Tashkent",
  "Asia/Samarkand",
  "Asia/Almaty",
  "Europe/Moscow",
  "Europe/Istanbul",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Tokyo",
] as const;

/** Reminder and report preferences — the same fields the scheduler reads. */
function NotificationSettings() {
  const t = useT();
  const toast = useSettingsToast();
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: queryKeys.parentSettings, queryFn: fetchParentSettings });

  const save = useMutation({
    mutationFn: updateParentSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.parentSettings, data);
      toast.saved();
    },
    onError: toast.failed,
  });

  const data = settings.data;
  const timezoneOptions: string[] =
    data && !TIMEZONES.includes(data.timezone as (typeof TIMEZONES)[number])
      ? [data.timezone, ...TIMEZONES]
      : [...TIMEZONES];

  return (
    <Card>
      <CardHeader title={t("nav.notifications")} subtitle={t("settings.notificationsSubtitle")} />
      <CardBody className="space-y-5">
        {settings.isLoading || !data ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="shimmer h-12 rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            <Switch
              label={t("push.dailyReminder")}
              description={t("settings.reminderHint")}
              checked={data.reminderEnabled}
              disabled={save.isPending}
              onChange={(v) => save.mutate({ reminderEnabled: v })}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("settings.reminderHour")} hint={t("settings.reminderHourHint")}>
                {({ id }) => (
                  <Select
                    id={id}
                    value={String(data.reminderHour)}
                    disabled={!data.reminderEnabled || save.isPending}
                    onChange={(e) => save.mutate({ reminderHour: Number(e.target.value) })}
                  >
                    {Array.from({ length: 24 }, (_, hour) => (
                      <option key={hour} value={hour}>
                        {String(hour).padStart(2, "0")}:00
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field label={t("settings.timezone")} hint={t("settings.timezoneHint")}>
                {({ id }) => (
                  <Select
                    id={id}
                    value={data.timezone}
                    disabled={save.isPending}
                    onChange={(e) => save.mutate({ timezone: e.target.value })}
                  >
                    {timezoneOptions.map((zone) => (
                      <option key={zone} value={zone}>
                        {zone.replace(/_/g, " ")}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            <Switch
              label={t("push.weeklyReport")}
              description={t("settings.weeklyReportHint")}
              checked={data.weeklyReportEnabled}
              disabled={save.isPending}
              onChange={(v) => save.mutate({ weeklyReportEnabled: v })}
            />
          </>
        )}
      </CardBody>
    </Card>
  );
}

/** Locale applies instantly and is stored on the account for other devices. */
function LanguageSection() {
  const { locale, setLocale } = useI18n();
  const t = useT();

  const persist = useMutation({
    mutationFn: (next: Locale) => updateProfile({ locale: next }),
  });

  return (
    <Card>
      <CardHeader title={t("common.language")} subtitle={t("settings.languageSubtitle")} />
      <CardBody className="grid gap-3 sm:grid-cols-3">
        {LOCALES.map((option) => {
          const active = option.code === locale;
          return (
            <button
              key={option.code}
              type="button"
              onClick={() => {
                setLocale(option.code);
                persist.mutate(option.code);
              }}
              aria-pressed={active}
              className={cn(
                "flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-colors",
                active ? "border-primary bg-primary-soft" : "border-border hover:border-border-strong",
              )}
            >
              <span className="text-2xl" aria-hidden>
                {option.flag}
              </span>
              <span className="min-w-0 flex-1">
                <span className="t-h4 block text-content">{option.label}</span>
                <span className="t-caption block text-content-secondary">{option.englishLabel}</span>
              </span>
              {active ? <Check className="h-5 w-5 shrink-0 text-primary" aria-hidden /> : null}
            </button>
          );
        })}
      </CardBody>
    </Card>
  );
}

/** Theme is a device preference; sound is the kid-app toggle. Both are client-side by design. */
function AppearanceSection() {
  const { preference, setPreference } = useTheme();
  const t = useT();
  const soundEnabled = useAppStore((s) => s.soundEnabled);
  const toggleSound = useAppStore((s) => s.toggleSound);

  const options: Array<{ id: ThemePreference; labelKey: "settings.themeLight" | "settings.themeDark" | "settings.themeSystem"; icon: typeof Sun; hintKey: "settings.themeLightHint" | "settings.themeDarkHint" | "settings.themeSystemHint" }> = [
    { id: "light", labelKey: "settings.themeLight", icon: Sun, hintKey: "settings.themeLightHint" },
    { id: "dark", labelKey: "settings.themeDark", icon: Moon, hintKey: "settings.themeDarkHint" },
    { id: "system", labelKey: "settings.themeSystem", icon: Monitor, hintKey: "settings.themeSystemHint" },
  ];

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title={t("common.theme")} subtitle={t("settings.appearanceSubtitle")} />
        <CardBody className="grid gap-3 sm:grid-cols-3">
          {options.map((option) => {
            const active = option.id === preference;
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setPreference(option.id)}
                aria-pressed={active}
                className={cn(
                  "rounded-lg border-2 p-4 text-left transition-colors",
                  active ? "border-primary bg-primary-soft" : "border-border hover:border-border-strong",
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-content-tertiary")} aria-hidden />
                  <span className="t-h4 text-content">{t(option.labelKey)}</span>
                </span>
                <span className="t-caption mt-1.5 block text-content-secondary">{t(option.hintKey)}</span>
              </button>
            );
          })}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("settings.soundTitle")} />
        <CardBody className="space-y-4">
          <Switch
            label={t("settings.soundLabel")}
            description={t("settings.soundHint")}
            checked={soundEnabled}
            onChange={toggleSound}
          />
          <div className={cn("rounded-lg p-4", toneStyles.mint.soft)}>
            <p className="t-label text-content">{t("settings.reducedMotionTitle")}</p>
            <p className="t-caption mt-1 text-content-secondary">{t("settings.reducedMotionBody")}</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

/** Per-child daily goal, saved straight to the child record. */
function ChildrenSettings() {
  const t = useT();
  const { plural } = useI18n();
  const toast = useSettingsToast();
  const queryClient = useQueryClient();
  const { children, loading } = useChildContext();

  const saveGoal = useMutation({
    mutationFn: ({ child, goal }: { child: ChildDto; goal: number }) =>
      updateChild(child.id, { dailyGoalLessons: goal }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.children });
      toast.saved();
    },
    onError: toast.failed,
  });

  return (
    <Card>
      <CardHeader title={t("nav.children")} subtitle={t("settings.childrenSubtitle")} />
      <CardBody className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="shimmer h-20 rounded-lg" />
            ))}
          </div>
        ) : (
          children.map((child) => (
            <div key={child.id} className="flex flex-wrap items-center gap-4 rounded-lg border border-border p-4">
              <Avatar
                spec={{
                  glyph: child.avatarGlyph,
                  tone: (child.avatarTone in toneStyles ? child.avatarTone : "brand") as keyof typeof toneStyles,
                }}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="t-h4 text-content">{child.name}</p>
                <p className="t-caption text-content-secondary">
                  {t("parent.ageYears", { age: child.age })} · {t("common.level")} {child.progress?.level ?? 1}
                </p>
              </div>
              <label className="flex items-center gap-2">
                <span className="t-caption font-semibold text-content-secondary">{t("parent.dailyGoal")}</span>
                <Select
                  value={String(child.dailyGoalLessons)}
                  className="w-32"
                  aria-label={t("settings.dailyGoalFor", { name: child.name })}
                  disabled={saveGoal.isPending}
                  onChange={(e) => saveGoal.mutate({ child, goal: Number(e.target.value) })}
                >
                  {[2, 3, 4, 5, 6, 7, 8, 10].map((n) => (
                    <option key={n} value={n}>
                      {plural("plural.lessons", n)}
                    </option>
                  ))}
                </Select>
              </label>
              <Badge tone="sun" size="sm">
                🔥 {child.progress?.currentStreak ?? 0}
              </Badge>
            </div>
          ))
        )}
      </CardBody>
    </Card>
  );
}

/**
 * Privacy is a set of guarantees baked into the product, not switches — this
 * section states them honestly instead of showing toggles nothing reads.
 */
function PrivacySection() {
  const t = useT();
  return (
    <Card>
      <CardHeader title={t("settings.privacyTitle")} subtitle={t("settings.privacySubtitle")} />
      <CardBody className="space-y-3">
        {(
          [
            ["settings.privacyLeaderboardTitle", "settings.privacyLeaderboardBody", "🏆"],
            ["settings.privacyAvatarsTitle", "settings.privacyAvatarsBody", "🖼️"],
            ["settings.privacyDataTitle", "settings.privacyDataBody", "🔒"],
          ] as const
        ).map(([titleKey, bodyKey, glyph]) => (
          <div key={titleKey} className="flex gap-3 rounded-lg border border-border bg-surface-muted p-4">
            <span className="text-2xl" aria-hidden>
              {glyph}
            </span>
            <div>
              <p className="t-label text-content">{t(titleKey)}</p>
              <p className="t-caption mt-1 text-content-secondary">{t(bodyKey)}</p>
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
