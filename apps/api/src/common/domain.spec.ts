import { describe, expect, it } from "vitest";
import {
  accessibleAgeCategories,
  accuracyPercent,
  ageCategoryForAge,
  applyActivityToStreak,
  calculateAge,
  consistencyLevel,
  dayKeyInTimezone,
  daysBetweenDayKeys,
  effectiveStreak,
  levelBreakdown,
  levelForXp,
  medalTierForStars,
  starsForAccuracy,
  xpForGameAttempt,
  xpRequiredForLevel,
} from "@kidslearn/types";

/**
 * These rules decide what a child sees, what they score and whether their
 * streak survives — the places where an off-by-one is felt by a real family.
 */

describe("age", () => {
  const reference = new Date("2026-08-10T00:00:00Z");

  it("counts whole years only", () => {
    expect(calculateAge("2021-03-14", reference)).toBe(5);
    expect(calculateAge("2020-01-22", reference)).toBe(6);
  });

  it("does not round up before the birthday", () => {
    // Birthday is tomorrow: still four.
    expect(calculateAge("2021-08-11", reference)).toBe(4);
    // Birthday is today: five.
    expect(calculateAge("2021-08-10", reference)).toBe(5);
  });

  it("never returns a negative age for a future date", () => {
    expect(calculateAge("2030-01-01", reference)).toBe(0);
  });

  it("maps ages onto curriculum bands", () => {
    expect(ageCategoryForAge(1)).toBe("AGE_1_2");
    expect(ageCategoryForAge(2)).toBe("AGE_1_2");
    expect(ageCategoryForAge(3)).toBe("AGE_3_4");
    expect(ageCategoryForAge(4)).toBe("AGE_3_4");
    expect(ageCategoryForAge(5)).toBe("AGE_5_7");
    // Older children stay in the top band rather than falling off the end.
    expect(ageCategoryForAge(9)).toBe("AGE_5_7");
  });

  it("gates content upwards but never downwards", () => {
    expect(accessibleAgeCategories("AGE_1_2")).toEqual(["AGE_1_2"]);
    expect(accessibleAgeCategories("AGE_3_4")).toContain("AGE_1_2");
    // A five-year-old may still replay the toddler games.
    expect(accessibleAgeCategories("AGE_5_7")).toEqual(["AGE_1_2", "AGE_3_4", "AGE_5_7"]);
    // A toddler must never be shown the oldest band.
    expect(accessibleAgeCategories("AGE_1_2")).not.toContain("AGE_5_7");
  });
});

describe("levels", () => {
  it("starts at level 1 with no XP", () => {
    expect(levelForXp(0)).toBe(1);
    expect(xpRequiredForLevel(1)).toBe(0);
  });

  it("grows the requirement with each level", () => {
    const thresholds = [1, 2, 3, 5, 10].map(xpRequiredForLevel);
    for (let i = 1; i < thresholds.length; i += 1) {
      expect(thresholds[i]).toBeGreaterThan(thresholds[i - 1]);
    }
  });

  it("reports progress within the current level", () => {
    const atLevelTwo = levelBreakdown(xpRequiredForLevel(2));
    expect(atLevelTwo.level).toBe(2);
    expect(atLevelTwo.xpIntoLevel).toBe(0);
    expect(atLevelTwo.percentToNextLevel).toBe(0);

    const midway = levelBreakdown(xpRequiredForLevel(2) + Math.floor(atLevelTwo.xpForNextLevel / 2));
    expect(midway.level).toBe(2);
    expect(midway.percentToNextLevel).toBeGreaterThan(40);
    expect(midway.percentToNextLevel).toBeLessThan(60);
  });
});

describe("scoring", () => {
  it("awards five stars only for a clean sweep", () => {
    expect(starsForAccuracy(6, 6)).toBe(5);
    expect(starsForAccuracy(5, 6)).toBe(4);
    expect(starsForAccuracy(0, 6)).toBe(0);
  });

  it("never divides by zero", () => {
    expect(starsForAccuracy(0, 0)).toBe(0);
    expect(accuracyPercent(0, 0)).toBe(0);
    expect(xpForGameAttempt(0, 0, "EASY")).toBe(0);
  });

  it("pays more for harder games", () => {
    expect(xpForGameAttempt(6, 6, "HARD")).toBeGreaterThan(xpForGameAttempt(6, 6, "EASY"));
  });

  it("awards medals at the documented thresholds", () => {
    expect(medalTierForStars(24)).toBeNull();
    expect(medalTierForStars(25)).toBe("BRONZE");
    expect(medalTierForStars(100)).toBe("SILVER");
    expect(medalTierForStars(250)).toBe("GOLD");
    expect(medalTierForStars(500)).toBe("DIAMOND");
  });
});

describe("streaks", () => {
  const base = { currentStreak: 3, longestStreak: 5, lastActiveDayKey: "2026-08-10" };

  it("extends across consecutive days", () => {
    expect(applyActivityToStreak(base, "2026-08-11").currentStreak).toBe(4);
  });

  it("does not double-count a second session on the same day", () => {
    expect(applyActivityToStreak(base, "2026-08-10")).toEqual(base);
  });

  it("restarts after a missed day", () => {
    expect(applyActivityToStreak(base, "2026-08-13").currentStreak).toBe(1);
  });

  it("ignores a late sync from the past", () => {
    // An attempt uploaded after coming back online must not rewrite history.
    expect(applyActivityToStreak(base, "2026-08-01")).toEqual(base);
  });

  it("raises the record only when it is beaten", () => {
    const nearRecord = { currentStreak: 5, longestStreak: 5, lastActiveDayKey: "2026-08-10" };
    expect(applyActivityToStreak(nearRecord, "2026-08-11").longestStreak).toBe(6);
  });

  it("starts a streak from nothing", () => {
    const fresh = applyActivityToStreak({ currentStreak: 0, longestStreak: 0, lastActiveDayKey: null }, "2026-08-10");
    expect(fresh).toEqual({ currentStreak: 1, longestStreak: 1, lastActiveDayKey: "2026-08-10" });
  });

  it("reports a lapsed streak as zero without needing a write", () => {
    expect(effectiveStreak(base, "2026-08-10")).toBe(3);
    expect(effectiveStreak(base, "2026-08-11")).toBe(3);
    // Two days later the streak has already broken.
    expect(effectiveStreak(base, "2026-08-12")).toBe(0);
  });

  it("crosses month and year boundaries", () => {
    expect(daysBetweenDayKeys("2026-08-31", "2026-09-01")).toBe(1);
    expect(daysBetweenDayKeys("2026-12-31", "2027-01-01")).toBe(1);
    expect(applyActivityToStreak({ ...base, lastActiveDayKey: "2026-12-31" }, "2027-01-01").currentStreak).toBe(4);
  });
});

describe("timezones", () => {
  it("buckets an instant by the configured zone, not the server's", () => {
    // 20:00 UTC is already the next day in Tashkent (UTC+5).
    const instant = new Date("2026-08-10T20:00:00Z");
    expect(dayKeyInTimezone(instant, "UTC")).toBe("2026-08-10");
    expect(dayKeyInTimezone(instant, "Asia/Tashkent")).toBe("2026-08-11");
  });

  it("keeps a late-evening session on the same local day", () => {
    const instant = new Date("2026-08-10T18:00:00Z"); // 23:00 in Tashkent
    expect(dayKeyInTimezone(instant, "Asia/Tashkent")).toBe("2026-08-10");
  });
});

describe("consistency grid", () => {
  it("scales the heat by time spent", () => {
    expect(consistencyLevel(0)).toBe(0);
    expect(consistencyLevel(60)).toBe(1);
    expect(consistencyLevel(600)).toBe(2);
    expect(consistencyLevel(1200)).toBe(3);
    expect(consistencyLevel(3600)).toBe(4);
  });
});
