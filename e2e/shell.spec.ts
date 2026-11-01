import type { Page } from "@playwright/test";
import { expect, expectNoA11yViolations, test } from "./fixtures";

const THEME_KEY = "ts:v1:theme";

async function storeTheme(page: Page, theme: string) {
  await page.addInitScript(
    ([key, value]) => {
      // Only seed once, so later reloads keep what the page stored.
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem(key!, value!);
        sessionStorage.setItem("seeded", "1");
      }
    },
    [THEME_KEY, theme],
  );
}

/** Counts View Transition starts, to check that reduced motion skips them. */
async function countViewTransitions(page: Page) {
  await page.addInitScript(() => {
    const w = window as Window & { __vt?: number };
    w.__vt = 0;
    const original = document.startViewTransition?.bind(document);
    if (original) {
      document.startViewTransition = ((arg: never) => {
        w.__vt! += 1;
        return original(arg);
      }) as typeof document.startViewTransition;
    }
  });
  return () => page.evaluate(() => (window as Window & { __vt?: number }).__vt ?? 0);
}

async function chooseTheme(page: Page, label: "Light" | "Dark" | "System") {
  await page.getByRole("button", { name: /^Theme:/ }).click();
  await page.getByRole("menuitemradio", { name: label }).click();
}

test.describe("app shell", () => {
  test("has the landmarks and a working skip link", async ({ page, browserName }) => {
    await page.goto("/");
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();

    // WebKit only tabs to links with the "Press Tab to highlight each item" setting.
    test.skip(browserName === "webkit", "WebKit skips links on Tab by default");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
  });

  test("category navigation is in the header on desktop", async ({ page, isMobile }) => {
    test.skip(isMobile, "Desktop layout");
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Categories" });
    for (const name of ["PDF", "Image", "Developer"]) {
      await expect(nav.getByRole("link", { name })).toBeVisible();
    }
  });

  test("mobile menu opens a sheet with the navigation", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile layout");
    await page.goto("/");
    const menu = page.getByRole("button", { name: "Menu" });
    await menu.click();
    const sheet = page.getByRole("dialog", { name: "Menu" });
    await expect(sheet.getByRole("link", { name: /PDF tools/ })).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Privacy" })).toBeVisible();
    await expectNoA11yViolations(page);
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(menu).toBeFocused();
  });

  test("footer links to the site pages", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    for (const name of [
      "PDF tools",
      "Image tools",
      "Developer tools",
      "About",
      "Privacy",
      "Terms",
      "Licenses",
    ]) {
      await expect(footer.getByRole("link", { name, exact: true })).toBeVisible();
    }
  });
});

test.describe("theme", () => {
  test("a stored theme is applied before first paint", async ({ page }) => {
    await storeTheme(page, "dark");
    // Record the class as soon as the body starts parsing, before any app script runs.
    await page.addInitScript(() => {
      document.addEventListener(
        "readystatechange",
        () => {
          (window as Window & { __darkAtParse?: boolean }).__darkAtParse ??=
            document.documentElement.classList.contains("dark");
        },
        { once: true },
      );
    });
    await page.goto("/");
    expect(
      await page.evaluate(() => (window as Window & { __darkAtParse?: boolean }).__darkAtParse),
    ).toBe(true);
  });

  test("system theme follows the OS setting", async ({ page, browserName }) => {
    // Playwright's Firefox ignores color-scheme emulation in matchMedia().
    test.skip(browserName === "firefox", "prefers-color-scheme not emulated in Firefox");
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/dark/);
    // Only Chromium fires matchMedia change events when emulation changes.
    test.skip(browserName !== "chromium", "Live OS change only emulated in Chromium");
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("the toggle switches and persists the theme", async ({ page, browserName }) => {
    await page.emulateMedia({ colorScheme: "light" });
    // Playwright's WebKit build crashes in the theme View Transition on longer
    // pages (found in Phase 4; real Safari to be checked in P9-T01). This test
    // is about switching and persisting, so WebKit runs it without the transition.
    if (browserName === "webkit") await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await chooseTheme(page, "Dark");
    await expect(page.locator("html")).toHaveClass(/dark/);
    expect(await page.evaluate((key) => localStorage.getItem(key), THEME_KEY)).toBe("dark");

    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByRole("button", { name: "Theme: Dark" })).toBeVisible();

    await chooseTheme(page, "System");
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("theme changes use a View Transition, except under reduced motion", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "View Transitions checked in Chromium");
    const count = await countViewTransitions(page);
    await page.goto("/");
    await chooseTheme(page, "Dark");
    await expect.poll(count).toBe(1);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await chooseTheme(page, "Light");
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    expect(await count()).toBe(1);
  });
});

test.describe("command palette", () => {
  test("opens with Ctrl/⌘+K and runs an action", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.keyboard.press("ControlOrMeta+k");
    const dialog = page.getByRole("dialog", { name: "Search tools and actions" });
    await expect(dialog).toBeVisible();
    await page.keyboard.type("dark");
    await expect(dialog.getByRole("option", { name: /Theme: Dark/ })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(dialog).toBeHidden();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("finds tools by name, synonym and file type", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("ControlOrMeta+k");
    const dialog = page.getByRole("dialog", { name: "Search tools and actions" });
    const input = dialog.getByRole("combobox");
    await input.fill("jwt");
    await expect(dialog.getByRole("option").first()).toHaveText(/JWT Decoder/);
    await input.fill("combine pdf");
    await expect(dialog.getByRole("option").first()).toHaveText(/Merge PDF/);
    await input.fill("heic");
    await expect(dialog.getByRole("option", { name: /Convert Image/ })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/convert-image$/);
  });

  test("lists favorites and recent tools first", async ({ page }) => {
    await page.goto("/json-formatter");
    await page.getByRole("button", { name: "Favorite" }).click();
    await expect(page.getByRole("button", { name: "Favorite" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.goto("/merge-pdf");
    // The shortcut listener exists only after hydration.
    await page.waitForFunction(() => document.documentElement.hasAttribute("data-app-started"));
    await page.keyboard.press("ControlOrMeta+k");
    const dialog = page.getByRole("dialog", { name: "Search tools and actions" });
    await expect(dialog.getByRole("group", { name: "Favorites" })).toContainText("JSON Formatter");
    await expect(dialog.getByRole("group", { name: "Recent" })).toContainText("Merge PDF");
    // Only slugs are stored, never content (CLAUDE.md rule 4).
    const stored = await page.evaluate(() => [
      localStorage.getItem("ts:v1:favorites"),
      localStorage.getItem("ts:v1:recent"),
    ]);
    expect(stored).toEqual(['["json-formatter"]', '["merge-pdf","json-formatter"]']);
  });

  test("closes on Escape and returns focus to the trigger", async ({ page, isMobile }) => {
    await page.goto("/");
    const trigger = isMobile
      ? page.getByRole("button", { name: "Search tools" })
      : page.getByRole("button", { name: /Search tools…/ });
    // Keyboard activation: WebKit does not focus buttons on click (as in Safari).
    await trigger.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Search tools and actions" });
    await expect(dialog.getByRole("combobox")).toBeFocused();
    await expectNoA11yViolations(page);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});

test.describe("component gallery", () => {
  test("is not indexed", async ({ page }) => {
    await page.goto("/_gallery");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Component gallery");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
  });

  for (const colorScheme of ["light", "dark"] as const) {
    test(`has no axe violations (${colorScheme} page theme)`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto("/_gallery");
      await expectNoA11yViolations(page);
    });
  }

  test("dialog traps focus and restores it on close", async ({ page }) => {
    await page.goto("/_gallery");
    const trigger = page.getByRole("button", { name: "Dialog", exact: true }).first();
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Remove all files?" });
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }
    await expectNoA11yViolations(page);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("segmented control and tabs work with the keyboard", async ({ page }) => {
    await page.goto("/_gallery");
    const mode = page.getByRole("radiogroup", { name: "Mode" }).first();
    await mode.getByRole("radio", { name: "Encode" }).focus();
    // Radix moves focus after keydown and selects only while the arrow is
    // held, so hold it like a real key press instead of an instant press().
    await page.keyboard.down("ArrowRight");
    await expect(mode.getByRole("radio", { name: "Decode" })).toBeChecked();
    await page.keyboard.up("ArrowRight");

    const tabs = page.getByRole("tablist", { name: "Tool information" }).first();
    await tabs.getByRole("tab", { name: "How to use" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.getByRole("tab", { name: "Formats & limits" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("copy button announces the copy", async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "Clipboard permissions are Chromium-only in Playwright");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/_gallery");
    await page.getByRole("button", { name: "Copy", exact: true }).first().click();
    await expect(page.getByRole("status").filter({ hasText: "Copied" })).toHaveCount(1);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("eyJhbGciOiJIUzI1NiJ9");
  });
});

test("home and 404 have no axe violations in dark mode", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expectNoA11yViolations(page);
  await page.goto("/does-not-exist");
  await expectNoA11yViolations(page);
});
