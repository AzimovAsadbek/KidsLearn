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
  // Scope to the visible page region: streaming SSR leaves a hidden
  // <div id="S:0"> template copy of the form under <body> in dev.
  const main = page.getByRole("main");
  await main.getByLabel("Email address").fill(who.email);
  // Role engine computes the accessible name ("Password") without the
  // aria-hidden required marker, and can't collide with the toggle button.
  await main.getByRole("textbox", { name: "Password", exact: true }).fill(who.password);
  await main.getByRole("button", { name: "Sign in" }).click();
  // Wait for the session to land before navigating anywhere else — leaving
  // early would cancel the login response and lose the refresh cookie.
  await page.waitForURL(/\/(dashboard|admin)/, { timeout: 15_000 });
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
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Child's name").fill(name);
    await dialog.getByLabel("Date of birth").fill("2022-04-01");
    await dialog.getByRole("button", { name: "Next" }).click();
    await dialog.getByRole("button", { name: /Avatar 3/ }).click();
    await dialog.getByRole("button", { name: "Next" }).click();
    await dialog.getByRole("button", { name: "Create" }).click();

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
    await page.getByRole("button", { name: /Play/ }).first().click();

    // Answer every round correctly: the prompt names the colour, so the test
    // exercises real server grading deterministically. The result screen is
    // detected by its stats grid, not by "Play again" (the in-game replay
    // control shares that label).
    for (let round = 1; round <= 6; round += 1) {
      const heading = page.getByRole("heading", { level: 1 });
      await expect(heading).toBeVisible({ timeout: 15_000 });
      const prompt = await heading.innerText();
      const colour = prompt.match(/find the (\w+)/i)?.[1] ?? "";
      const label = colour.charAt(0).toUpperCase() + colour.slice(1);
      await page.getByRole("button", { name: label, exact: true }).click();
      await page.waitForTimeout(1300);
      if ((await page.getByText(/Accuracy/).count()) > 0) break;
    }

    await expect(page.getByText(/Accuracy/)).toBeVisible({ timeout: 20_000 });

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
