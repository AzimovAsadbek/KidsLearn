"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneStyles, type Tone } from "@/lib/tone";
import { useT } from "@/i18n/provider";
import type { AvatarSpec } from "@/types";
import { avatarChoices } from "@/data/children";
import { createChild, fetchSubjects, queryKeys } from "@/lib/api/queries";
import { ApiError } from "@/lib/api/client";
import { Modal } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { DatePicker, Field, Input } from "@/components/ui/field";
import { StepDots } from "@/components/ui/progress";
import { useAppStore } from "@/store/app-store";
import { calculateAge as deriveAge } from "@kidslearn/types";

const STEPS = ["Who are they?", "Pick an avatar", "First subject"] as const;

/**
 * Three short steps rather than one long form — a young family is usually
 * filling this in one-handed, and age is derived rather than asked twice.
 */
export function AddChildModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const pushToast = useAppStore((s) => s.pushToast);
  const queryClient = useQueryClient();

  const { data: subjectList } = useQuery({ queryKey: queryKeys.subjects, queryFn: () => fetchSubjects() });
  const subjects = subjectList ?? [];

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [avatar, setAvatar] = useState<AvatarSpec>(avatarChoices[0]);
  const [subjectId, setSubjectId] = useState<string>("");
  const [errors, setErrors] = useState<{ name?: string; birthDate?: string }>({});

  const age = useMemo(() => (birthDate ? deriveAge(birthDate) : null), [birthDate]);

  function reset() {
    setStep(0);
    setName("");
    setBirthDate("");
    setAvatar(avatarChoices[0]);
    setSubjectId("");
    setErrors({});
  }

  function validateStepOne(): boolean {
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = "Please enter your child's name.";
    if (!birthDate) next.birthDate = "A date of birth lets us match lessons to their age.";
    else if (new Date(birthDate) > new Date()) next.birthDate = "That date is in the future.";
    else if (deriveAge(birthDate) > 12) next.birthDate = "KidsLearn is designed for ages 1–7.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  const create = useMutation({
    mutationFn: createChild,
    onSuccess: async (child) => {
      // The switcher, the dashboard and every child-scoped query read from here.
      await queryClient.invalidateQueries({ queryKey: queryKeys.children });
      pushToast({
        title: `${child.name} is ready to learn`,
        description: "We've matched the starter path to their age.",
        tone: "mint",
        glyph: "🎉",
      });
      reset();
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.details) {
        setErrors({ name: error.details.name?.[0], birthDate: error.details.dateOfBirth?.[0] });
        setStep(0);
        return;
      }
      pushToast({
        title: error instanceof ApiError ? error.message : "We couldn't add that child.",
        tone: "coral",
        glyph: "⚠️",
      });
    },
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (step === 0 && !validateStepOne()) return;
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }

    create.mutate({
      name: name.trim(),
      dateOfBirth: birthDate,
      avatarGlyph: avatar.glyph,
      avatarTone: avatar.tone,
      dailyGoalLessons: 4,
      ...(subjectId ? { favouriteSubjectId: subjectId } : {}),
    });
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={t("parent.addChildTitle")}
      description={t("parent.addChildSubtitle")}
      size="md"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <StepDots total={STEPS.length} current={step} />
          <div className="flex gap-2">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)} type="button">
                {t("common.back")}
              </Button>
            ) : null}
            <Button type="submit" form="add-child-form" loading={create.isPending}>
              {step === STEPS.length - 1 ? t("common.create") : t("common.next")}
            </Button>
          </div>
        </div>
      }
    >
      <form id="add-child-form" onSubmit={onSubmit} noValidate>
        <p className="t-overline mb-4 text-content-tertiary">
          Step {step + 1} of {STEPS.length} · {STEPS[step]}
        </p>

        {step === 0 ? (
          <div className="space-y-4">
            <Field label={t("parent.childName")} error={errors.name} required>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ali"
                />
              )}
            </Field>

            <Field
              label={t("parent.dateOfBirth")}
              error={errors.birthDate}
              hint={t("parent.ageHint")}
              required
            >
              {({ id, describedBy, invalid }) => (
                <DatePicker
                  id={id}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  value={birthDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              )}
            </Field>

            {age !== null ? (
              <div className="flex items-center gap-3 rounded-lg bg-primary-soft px-4 py-3">
                <span className="text-2xl" aria-hidden>
                  🎂
                </span>
                <p className="t-body-sm font-semibold text-primary">{t("parent.ageCalculated", { age })}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 1 ? (
          <fieldset>
            <legend className="t-label mb-3 text-content">{t("parent.pickAvatar")}</legend>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
              {avatarChoices.map((choice, index) => {
                const selected = choice.glyph === avatar.glyph;
                return (
                  <button
                    key={`${choice.glyph}-${index}`}
                    type="button"
                    onClick={() => setAvatar(choice)}
                    aria-pressed={selected}
                    aria-label={`Avatar ${index + 1}`}
                    className={cn(
                      "tactile relative grid aspect-square place-items-center rounded-lg border-2 text-3xl transition-colors",
                      toneStyles[choice.tone].soft,
                      selected ? "border-primary" : "border-transparent hover:border-border-strong",
                    )}
                  >
                    <span aria-hidden>{choice.glyph}</span>
                    {selected ? (
                      <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-on">
                        <Check className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <p className="t-caption mt-4 text-content-secondary">
              Avatars are illustrations, never photos — children are never identifiable in KidsLearn.
            </p>
          </fieldset>
        ) : null}

        {step === 2 ? (
          <fieldset>
            <legend className="t-label mb-3 text-content">Where should {name || "they"} start?</legend>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {subjects.slice(0, 6).map((subject) => {
                const selected = subject.id === subjectId;
                return (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => setSubjectId(subject.id)}
                    aria-pressed={selected}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-colors",
                      selected ? "border-primary bg-primary-soft" : "border-border hover:border-border-strong",
                    )}
                  >
                    <span
                      className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-sm text-xl", toneStyles[subject.tone as Tone].soft)}
                      aria-hidden
                    >
                      {subject.glyph}
                    </span>
                    <span className="min-w-0">
                      <span className="t-body-sm block font-semibold text-content">{subject.name}</span>
                      <span className="t-caption block truncate text-content-secondary">
                        {subject.lessonCount} lessons
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}
      </form>
    </Modal>
  );
}
