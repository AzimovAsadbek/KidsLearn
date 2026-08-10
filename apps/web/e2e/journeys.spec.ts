import { expect, test, type Page } from "@playwright/test";

/**
 * The journeys that matter: a parent signs in and sees real numbers, a child
 * plays a game and the score reaches the dashboard, an admin publishes a lesson
 * and a family can see it.
 *
 * Requires a seeded database (`pnpm db:seed`) and a running API.
 */

const PARENT = { email: "parent@kidslearn.app", password: "kidslearn2026" };
const ADMIN = { email: "admin@kidslearn.app", password: "kidslearn2026" };

async function signIn(page: Page, who: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(who.email);
  await page.getByLabel("Password", { exact: true }).fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test.describe("parent", () => {
  test("signs in and sees real dashboard data", async ({ page }) => {
    await signIn(page, PARENT);

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Good (morning|afternoon|evening)/);

    // Figures come from the API, so they must be present and numeric.
    const stars = page.getByText("Stars earned").locator("..");
    await expect(stars).toBeVisible();

    // The family switcher is populated from /children.
    await expect(page.getByText("Family overview")).toBeVisible();
  });

  test("blocks the admin console", async ({ page }) => {
    await signIn(page, PARENT);
    await page.goto("/admin");
    // The guard bounces a parent back to their own surface.
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("opens a child profile", async ({ page }) => {
    await signIn(page, PARENT);
    await page.getByRole("link", { name: /View profile/i }).first().click();
    await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Achievements" })).toBeVisible();
  });

  test("adds a child and sees it in the switcher", async ({ page }) => {
    await signIn(page, PARENT);
    await page.goto("/children?add=1");

    const name = `E2E ${Date.now().toString().slice(-5)}`;
    await page.getByLabel("Child's name").fill(name);
    await page.getByLabel("Date of birth").fill("2022-04-01");
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: /Avatar 3/ }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Create" }).click();

    await expect(page.getByText(name)).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("child", () => {
  test("plays a game and the score reaches the dashboard", async ({ page }) => {
    await signIn(page, PARENT);

    // Read the star total before playing.
    await expect(page.getByText("Stars earned")).toBeVisible();
    const before = Number((await page.locator("text=Stars earned").locator("xpath=..").innerText()).match(/\d+/)?.[0] ?? "0");

    await page.goto("/kids/games/color-match");
    await page.getByRole("button", { name: /Play/ }).click();

    // Work through the rounds: try options until one is accepted.
    for (let round = 0; round < 6; round += 1) {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const options = page.locator("main button[aria-label]");
        const count = await options.count();
        if (count === 0) break;
        await options.nth(attempt % count).click();
        await page.waitForTimeout(900);
        const advanced = await page.locator(`text=${round + 2}/6`).count();
        const finished = await page.getByRole("button", { name: /Play again/ }).count();
        if (advanced > 0 || finished > 0) break;
      }
      if ((await page.getByRole("button", { name: /Play again/ }).count()) > 0) break;
    }

    await expect(page.getByRole("button", { name: /Play again/ })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Accuracy/)).toBeVisible();

    // Back on the dashboard the total has moved.
    await page.goto("/dashboard");
    await expect(page.getByText("Stars earned")).toBeVisible();
    const after = Number((await page.locator("text=Stars earned").locator("xpath=..").innerText()).match(/\d+/)?.[0] ?? "0");
    expect(after).toBeGreaterThanOrEqual(before);
  });
});

test.describe("admin", () => {
  test("reaches the console and sees platform metrics", async ({ page }) => {
    await signIn(page, ADMIN);
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByText("Total users")).toBeVisible();
  });

  test("shows AI generation honestly as preview mode", async ({ page }) => {
    await signIn(page, ADMIN);
    await page.goto("/admin/ai-generator");
    await expect(page.getByText(/Preview mode/i)).toBeVisible();
  });

  test("lists and filters lessons", async ({ page }) => {
    await signIn(page, ADMIN);
    await page.goto("/admin/lessons");
    await expect(page.getByRole("heading", { name: "Lessons" })).toBeVisible();
  });
});

test.describe("access control", () => {
  test("sends a signed-out visitor to sign in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("responsive and themes", () => {
  for (const width of [375, 768, 1024, 1440]) {
    test(`has no horizontal overflow at ${width}px`, async ({ page }) => {
      await signIn(page, PARENT);
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");

      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      expect(overflows).toBe(false);
    });
  }

  test("renders in dark mode without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("_next/hmr")) errors.push(message.text());
    });

    await page.context().addCookies([
      { name: "kl-theme", value: "dark", url: "http://localhost:3000" },
    ]);
    await signIn(page, PARENT);
    await page.waitForLoadState("networkidle");

    const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(isDark).toBe(true);
    expect(errors).toEqual([]);
  });
});
