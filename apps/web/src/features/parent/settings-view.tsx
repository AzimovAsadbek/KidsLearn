"use client";

import { useState } from "react";
import { Check, Monitor, Moon, ShieldCheck, Sun } from "lucide-react";
import { calculateAge, cn } from "@/lib/utils";
import { toneStyles } from "@/lib/tone";
import { useI18n, useT } from "@/i18n/provider";
import { LOCALES } from "@/i18n/config";
import type { ThemePreference } from "@/types";
import { useTheme } from "@/components/providers/theme-provider";
import { useAppStore } from "@/store/app-store";
import { children, NOW, parent } from "@/data/children";
import { PageHeading } from "@/components/layout/app-shell";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Switch } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

type Section =
  | "profile"
  | "security"
  | "notifications"
  | "language"
  | "appearance"
  | "children"
  | "privacy"
  | "accessibility";

export function SettingsView() {
  const t = useT();
  const [section, setSection] = useState<Section>("profile");

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <PageHeading title={t("nav.settings")} subtitle="Account, family and platform preferences." />

      <Tabs
        variant="pill"
        ariaLabel="Settings sections"
        value={section}
        onChange={setSection}
        items={[
          { id: "profile", label: "Profile" },
          { id: "security", label: "Security" },
          { id: "notifications", label: t("nav.notifications") },
          { id: "language", label: t("common.language") },
          { id: "appearance", label: "Appearance" },
          { id: "children", label: t("nav.children") },
          { id: "privacy", label: "Privacy" },
          { id: "accessibility", label: "Accessibility" },
        ]}
      />

      {section === "profile" ? <ProfileSection /> : null}
      {section === "security" ? <SecuritySection /> : null}
      {section === "notifications" ? <NotificationSettings /> : null}
      {section === "language" ? <LanguageSection /> : null}
      {section === "appearance" ? <AppearanceSection /> : null}
      {section === "children" ? <ChildrenSettings /> : null}
      {section === "privacy" ? <PrivacySection /> : null}
      {section === "accessibility" ? <AccessibilitySection /> : null}
    </div>
  );
}

function SaveFooter() {
  const t = useT();
  const pushToast = useAppStore((s) => s.pushToast);
  return (
    <CardFooter className="justify-end">
      <Button variant="ghost">{t("common.cancel")}</Button>
      <Button onClick={() => pushToast({ title: "Settings saved", tone: "mint", glyph: "✅" })}>
        {t("common.save")}
      </Button>
    </CardFooter>
  );
}

function ProfileSection() {
  const t = useT();
  return (
    <Card>
      <CardHeader title="Your profile" subtitle="This is what your children's teachers and reports show." />
      <CardBody className="space-y-5">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar spec={parent.avatar} size="xl" />
          <div>
            <Button variant="secondary" size="sm">
              Change avatar
            </Button>
            <p className="t-caption mt-1.5 text-content-secondary">Illustrated avatars only — no photo uploads.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("auth.fullName")}>
            {({ id }) => <Input id={id} defaultValue={parent.name} />}
          </Field>
          <Field label={t("auth.email")}>
            {({ id }) => <Input id={id} type="email" defaultValue={parent.email} />}
          </Field>
          <Field label="Phone">{({ id }) => <Input id={id} type="tel" defaultValue={parent.phone} />}</Field>
          <Field label="Plan" hint="Family plan covers up to 6 children.">
            {({ id }) => (
              <Select id={id} defaultValue={parent.plan}>
                <option value="free">Free</option>
                <option value="family">Family</option>
                <option value="school">School</option>
              </Select>
            )}
          </Field>
        </div>
      </CardBody>
      <SaveFooter />
    </Card>
  );
}

function SecuritySection() {
  const [twoFactor, setTwoFactor] = useState(true);
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Password" subtitle="Use at least 8 characters with a number." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Current password">{({ id }) => <Input id={id} type="password" />}</Field>
          <span className="hidden sm:block" />
          <Field label="New password">{({ id }) => <Input id={id} type="password" />}</Field>
          <Field label="Confirm new password">{({ id }) => <Input id={id} type="password" />}</Field>
        </CardBody>
        <SaveFooter />
      </Card>

      <Card>
        <CardHeader title="Two-factor authentication" />
        <CardBody className="space-y-4">
          <Switch
            label="Require a code at sign-in"
            description="We'll text a six-digit code to your phone."
            checked={twoFactor}
            onChange={setTwoFactor}
          />
          <div className="rounded-lg border border-border bg-surface-muted p-4">
            <p className="t-label flex items-center gap-2 text-content">
              <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
              Parent PIN
            </p>
            <p className="t-caption mt-1 text-content-secondary">
              A four-digit PIN is required to leave kid mode or reach settings from a child device.
            </p>
            <Button variant="secondary" size="sm" className="mt-3">
              Change PIN
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function NotificationSettings() {
  const [prefs, setPrefs] = useState({
    achievements: true,
    newContent: true,
    dailyReminder: false,
    weeklyReport: true,
    email: true,
    push: true,
  });

  const rows: Array<[keyof typeof prefs, string, string]> = [
    ["achievements", "Achievements & medals", "When a child unlocks something new"],
    ["newContent", "New lessons and games", "When we publish content for their age"],
    ["dailyReminder", "Daily learning reminder", "If today's goal isn't complete by 18:00"],
    ["weeklyReport", "Weekly family report", "A Sunday summary of the whole family"],
  ];

  return (
    <Card>
      <CardHeader title="Notifications" subtitle="Choose what's worth interrupting you for." />
      <CardBody className="space-y-5">
        <div className="space-y-4">
          {rows.map(([key, label, description]) => (
            <Switch
              key={key}
              label={label}
              description={description}
              checked={prefs[key]}
              onChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))}
            />
          ))}
        </div>

        <div className="space-y-4 rounded-lg bg-surface-muted p-4">
          <p className="t-label text-content">Delivery channels</p>
          <Switch label="Email" checked={prefs.email} onChange={(v) => setPrefs((p) => ({ ...p, email: v }))} />
          <Switch label="Push notifications" checked={prefs.push} onChange={(v) => setPrefs((p) => ({ ...p, push: v }))} />
        </div>
      </CardBody>
      <SaveFooter />
    </Card>
  );
}

function LanguageSection() {
  const { locale, setLocale } = useI18n();
  const t = useT();

  return (
    <Card>
      <CardHeader title={t("common.language")} subtitle="Applies to the parent dashboard and the child app." />
      <CardBody className="grid gap-3 sm:grid-cols-3">
        {LOCALES.map((option) => {
          const active = option.code === locale;
          return (
            <button
              key={option.code}
              type="button"
              onClick={() => setLocale(option.code)}
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

function AppearanceSection() {
  const { preference, setPreference } = useTheme();
  const t = useT();

  const options: Array<{ id: ThemePreference; label: string; icon: typeof Sun; description: string }> = [
    { id: "light", label: "Light", icon: Sun, description: "Bright surfaces, best in daylight" },
    { id: "dark", label: "Dark", icon: Moon, description: "Deep indigo, easier at bedtime" },
    { id: "system", label: "System", icon: Monitor, description: "Follow the device setting" },
  ];

  return (
    <Card>
      <CardHeader title={t("common.theme")} subtitle="Dark mode is a redesigned surface stack, not an inversion." />
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
                <span className="t-h4 text-content">{option.label}</span>
              </span>
              <span className="t-caption mt-1.5 block text-content-secondary">{option.description}</span>
            </button>
          );
        })}
      </CardBody>
    </Card>
  );
}

function ChildrenSettings() {
  const t = useT();
  return (
    <Card>
      <CardHeader title={t("nav.children")} subtitle="Daily goals and content limits per child." />
      <CardBody className="space-y-3">
        {children.map((child) => (
          <div
            key={child.id}
            className="flex flex-wrap items-center gap-4 rounded-lg border border-border p-4"
          >
            <Avatar spec={child.avatar} size="md" />
            <div className="min-w-0 flex-1">
              <p className="t-h4 text-content">{child.name}</p>
              <p className="t-caption text-content-secondary">
                {calculateAge(child.birthDate, NOW)} years · Level {child.level}
              </p>
            </div>
            <label className="flex items-center gap-2">
              <span className="t-caption font-semibold text-content-secondary">Daily goal</span>
              <Select defaultValue={String(child.dailyGoalLessons)} className="w-24" aria-label={`${child.name} daily goal`}>
                {[2, 4, 6, 8, 10].map((n) => (
                  <option key={n} value={n}>
                    {n} lessons
                  </option>
                ))}
              </Select>
            </label>
            <Badge tone={child.avatar.tone} size="sm">
              🔥 {child.streakDays}
            </Badge>
          </div>
        ))}
      </CardBody>
      <SaveFooter />
    </Card>
  );
}

function PrivacySection() {
  const [prefs, setPrefs] = useState({ leaderboard: true, analytics: true, personalisation: true });

  return (
    <Card>
      <CardHeader title="Privacy & data" subtitle="KidsLearn collects the minimum needed to teach well." />
      <CardBody className="space-y-4">
        <Switch
          label="Show my children on the leaderboard"
          description="Only a display name and star count are ever visible to others."
          checked={prefs.leaderboard}
          onChange={(v) => setPrefs((p) => ({ ...p, leaderboard: v }))}
        />
        <Switch
          label="Share anonymous learning analytics"
          description="Helps us find lessons that confuse children. Never linked to a name."
          checked={prefs.analytics}
          onChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))}
        />
        <Switch
          label="Personalised AI recommendations"
          description="Turning this off replaces recommendations with an age-based path."
          checked={prefs.personalisation}
          onChange={(v) => setPrefs((p) => ({ ...p, personalisation: v }))}
        />

        <div className="rounded-lg border border-border bg-surface-muted p-4">
          <p className="t-label text-content">Your data</p>
          <p className="t-caption mt-1 text-content-secondary">
            Export everything we hold, or delete the family account and all children permanently.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm">
              Export data
            </Button>
            <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft">
              Delete account
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function AccessibilitySection() {
  const soundEnabled = useAppStore((s) => s.soundEnabled);
  const toggleSound = useAppStore((s) => s.toggleSound);
  const [prefs, setPrefs] = useState({ captions: true, largeText: false, highContrast: false });

  return (
    <Card>
      <CardHeader title="Accessibility" subtitle="These apply to the child experience as well." />
      <CardBody className="space-y-4">
        <Switch
          label="Sound effects and narration"
          description="Lesson audio, correct/incorrect cues and the read-aloud button."
          checked={soundEnabled}
          onChange={toggleSound}
        />
        <Switch
          label="Captions for spoken instructions"
          description="Every instruction also appears as text on screen."
          checked={prefs.captions}
          onChange={(v) => setPrefs((p) => ({ ...p, captions: v }))}
        />
        <Switch
          label="Larger text"
          description="Increases base type size across the whole product."
          checked={prefs.largeText}
          onChange={(v) => setPrefs((p) => ({ ...p, largeText: v }))}
        />
        <Switch
          label="Higher contrast"
          description="Strengthens borders and text against surfaces."
          checked={prefs.highContrast}
          onChange={(v) => setPrefs((p) => ({ ...p, highContrast: v }))}
        />

        <div className={cn("rounded-lg p-4", toneStyles.mint.soft)}>
          <p className="t-label text-content">Reduced motion is automatic</p>
          <p className="t-caption mt-1 text-content-secondary">
            When your device asks for reduced motion, KidsLearn drops confetti, floating animations and
            transitions — no setting needed.
          </p>
        </div>
      </CardBody>
      <SaveFooter />
    </Card>
  );
}
