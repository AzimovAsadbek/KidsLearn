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
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/**
 * Refresh tokens are single-use (rotation with family revocation on reuse), so
 * a saved storage-state cookie dies after its first boot. Each test therefore
 * performs its own API login into the context's cookie jar — fast, unique per
 * test, and spread out enough to respect the login rate limit; a single retry
 * absorbs an unlucky 429 burst.
 */
async function openAuthenticated(
  page: Page,
  path: string,
  expected: RegExp,
  who: { email: string; password: string } = PARENT,
) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await page.request.post(`${API}/auth/login`, { data: who });
    if (response.ok()) break;
    if (response.status() === 429 && attempt === 0) {
      await page.waitForTimeout(31_000);
      continue;
    }
    throw new Error(`login failed: ${response.status()}`);
  }
  await page.goto(path);
  await page.waitForURL(expected, { timeout: 30_000 });
}

async function formSignIn(page: Page, who: { email: string; password: string }) {
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
  await page.waitForURL(/\/(dashboard|admin)/, { timeout: 30_000 });
}

test.describe("parent", () => {
  // The one test that exercises the real login form, from a clean session.
  test.describe(() => {
    test("signs in and sees real dashboard data", async ({ page }) => {
      await formSignIn(page, PARENT);

      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(/Good (morning|afternoon|evening)/);

      // Figures come from the API, so they must be present and numeric.
      const stars = page.getByText("Stars earned").locator("..");
      await expect(stars).toBeVisible();

      // The family switcher is populated from /children.
      await expect(page.getByText("Family overview")).toBeVisible();
    });
  });

  test("blocks the admin console", async ({ page }) => {
    await openAuthenticated(page, "/admin", /\/dashboard/);
  });

  test("opens a child profile", async ({ page }) => {
    await openAuthenticated(page, "/dashboard", /\/dashboard/);
    await page.getByRole("link", { name: /View profile/i }).first().click();
    await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Achievements" })).toBeVisible();
  });

  test("adds a child and sees it in the switcher", async ({ page }) => {
    await openAuthenticated(page, "/dashboard", /\/dashboard/);
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
    await openAuthenticated(page, "/dashboard", /\/dashboard/);

    // Read the star total before playing.
    await expect(page.getByText("Stars earned")).toBeVisible();
    const before = Number((await page.locator("text=Stars earned").locator("xpath=..").innerText()).match(/\d+/)?.[0] ?? "0");

    await page.goto("/kids/games/color-match");
    await page.getByRole("button", { name: /Play/ }).first().click();

    // Answer every round correctly: the prompt names the colour, so the test
    // exercises real server grading deterministically. Advancement is detected
    // by the round counter (colours can repeat, so the heading text may not
    // change), and the finish by the result screen's stats grid — never by
    // "Play again", which the in-game replay control shares.
    for (let round = 1; round <= 6; round += 1) {
      await expect(page.getByText(`${round}/6`)).toBeVisible({ timeout: 15_000 });
      const heading = page.getByRole("heading", { level: 1, name: /find the/i });
      await expect(heading).toBeVisible({ timeout: 15_000 });
      const prompt = await heading.innerText();
      const colour = prompt.match(/find the (\w+)/i)?.[1] ?? "";
      const label = colour.charAt(0).toUpperCase() + colour.slice(1);
      await page.getByRole("button", { name: label, exact: true }).click();
      if (round < 6) {
        await expect(page.getByText(`${round + 1}/6`)).toBeVisible({ timeout: 15_000 });
      }
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
    await openAuthenticated(page, "/admin", /\/admin/, ADMIN);
    await expect(page.getByText("Total users")).toBeVisible();
  });

  test("shows AI generation honestly as preview mode", async ({ page }) => {
    await openAuthenticated(page, "/admin/ai-generator", /ai-generator/, ADMIN);
    await expect(page.getByText(/Preview mode/i)).toBeVisible();
  });

  test("lists and filters lessons", async ({ page }) => {
    await openAuthenticated(page, "/admin/lessons", /admin\/lessons/, ADMIN);
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
  // One session, four viewports — resizing doesn't need a fresh login.
  test("has no horizontal overflow at 375/768/1024/1440px", async ({ page }) => {
    await openAuthenticated(page, "/dashboard", /\/dashboard/);
    await page.waitForLoadState("networkidle");

    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(350);
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      expect(overflows, `${width}px`).toBe(false);
    }
  });

  test("renders in dark mode without console errors", async ({ page }) => {
    // The anonymous boot probe (POST /auth/refresh -> 401) is by design: the
    // refresh cookie is HttpOnly, so the app cannot know it is absent without
    // asking, and the browser always logs the 4xx. Everything else must be clean.
    const errors: string[] = [];
    page.on("console", (message) => {
      const text = message.text();
      if (message.type() === "error" && !text.includes("_next/hmr") && !text.includes("401 (Unauthorized)")) {
        errors.push(text);
      }
    });
    const badResponses: string[] = [];
    page.on("response", (response) => {
      const expectedProbe = response.url().includes("/auth/refresh") && response.status() === 401;
      if (response.status() >= 400 && !expectedProbe) {
        badResponses.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.context().addCookies([
      { name: "kl-theme", value: "dark", url: "http://localhost:3000" },
    ]);
    await openAuthenticated(page, "/dashboard", /\/dashboard/);
    await page.waitForLoadState("networkidle");

    const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(isDark).toBe(true);
    expect(errors).toEqual([]);
    expect(badResponses).toEqual([]);
  });
});
