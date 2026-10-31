import type { Page } from "@playwright/test";
import { exportJWK, exportSPKI, generateKeyPair, SignJWT } from "jose";
import { SAMPLE_SECRET } from "../../src/tools/jwt-decoder/constants";
import { expect, expectNoA11yViolations, test } from "../fixtures";

// JWT Decoder end to end (tool-specifications §5.2). noNetwork and csp run
// automatically: tokens and keys never leave the origin, including on Verify.

const editor = (page: Page) => page.getByRole("textbox", { name: "JWT" });
const verifyStatus = (page: Page) =>
  page.getByRole("region", { name: /^Verify signature/ }).getByRole("status");

/** Loads the tool and waits until it responds (clicks before hydration do nothing). */
async function open(page: Page) {
  await page.goto("/jwt-decoder");
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-app-started"));
}

/** Replaces the editor content; clearing first keeps Firefox's CodeMirror reliable. */
async function fill(page: Page, text: string) {
  await editor(page).focus();
  await expect(page.locator(".cm-editor").first()).toBeVisible();
  const clear = page.getByRole("button", { name: "Clear input" });
  if (await clear.isEnabled()) await clear.click();
  await editor(page).fill(text);
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

async function bothThemesAccessible(page: Page) {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await expectNoA11yViolations(page);
  }
}

test.describe("jwt-decoder", () => {
  test("empty state is accessible in both themes", async ({ page }) => {
    await open(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("JWT decoder and verifier");
    await expect(page.getByText("Nothing to show yet")).toBeVisible();
    await bothThemesAccessible(page);
  });

  test("decodes the sample and verifies it with its secret", async ({ page }) => {
    test.slow(); // Four axe scans.
    await open(page);
    await page.getByRole("button", { name: "Sample", exact: true }).click();
    await expect(page.getByText("Valid", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Payload" })).toContainText(
      '"name": "Ada Lovelace"',
    );
    await expect(page.getByText("exp (Expires)")).toBeVisible();
    await bothThemesAccessible(page);

    const secret = page.getByRole("textbox", { name: "Secret" });
    await secret.fill("wrong-secret");
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(verifyStatus(page)).toHaveText("Invalid signature");
    await secret.fill(SAMPLE_SECRET);
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(verifyStatus(page)).toHaveText("Signature verified");
    // Tokens are never put in the URL or stored.
    expect(new URL(page.url()).search).toBe("");
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).not.toContain("eyJ");
    await bothThemesAccessible(page);
  });

  test("an expired RS256 token verifies with a PEM public key", async ({ page }) => {
    const { publicKey, privateKey } = await generateKeyPair("RS256", { extractable: true });
    const token = await new SignJWT({ sub: "user-1" })
      .setProtectedHeader({ alg: "RS256" })
      .setExpirationTime(nowSeconds() - 3 * 3600)
      .sign(privateKey);
    await open(page);
    await fill(page, `Bearer ${token}`);
    await expect(page.getByText("Expired", { exact: true })).toBeVisible();
    await expect(page.getByText(/^Expired 3 hours ago/)).toBeVisible();
    await page.getByRole("textbox", { name: "Public key" }).fill(await exportSPKI(publicKey));
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(verifyStatus(page)).toHaveText("Signature verified");
  });

  test("an ES256 token verifies with a JWK; a wrong key is rejected", async ({ page }) => {
    const { publicKey, privateKey } = await generateKeyPair("ES256", { extractable: true });
    const other = await generateKeyPair("ES256", { extractable: true });
    const token = await new SignJWT({ sub: "user-2" })
      .setProtectedHeader({ alg: "ES256" })
      .setNotBefore(nowSeconds() + 3600)
      .sign(privateKey);
    await open(page);
    await fill(page, token);
    await expect(page.getByText("Not yet valid", { exact: true })).toBeVisible();
    const key = page.getByRole("textbox", { name: "Public key" });
    await key.fill(JSON.stringify(await exportJWK(other.publicKey)));
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(verifyStatus(page)).toHaveText("Invalid signature");
    await key.fill(JSON.stringify(await exportJWK(publicKey)));
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(verifyStatus(page)).toHaveText("Signature verified");
  });

  test("flags alg: none and locates malformed tokens", async ({ page }) => {
    await open(page);
    await fill(page, "eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.");
    await expect(page.getByText(/it isn’t signed, so anyone can change it/)).toBeVisible();

    await fill(page, "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0");
    const alert = page.getByRole("alert").filter({ hasText: "This isn’t a valid JWT" });
    await expect(alert).toContainText("This has 2 parts separated by dots; a JWT has 3");
    await fill(page, "eyJhbGciOiJIUzI1NiJ9.eyJz!WIiOiJ4In0.c2ln");
    await expect(alert).toContainText("Line 1, column 26: The payload contains “!”");
    await page.getByRole("button", { name: "Go to error" }).click();
    await expect(editor(page)).toBeFocused();
    await bothThemesAccessible(page);
  });

  test("keyboard only: paste and verify", async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard flow is for desktop");
    await open(page);
    await page.getByRole("button", { name: "Sample", exact: true }).focus();
    await page.keyboard.press("Enter");
    await page.getByRole("textbox", { name: "Secret" }).focus();
    await page.keyboard.type(SAMPLE_SECRET);
    await page.keyboard.press("Enter");
    await expect(verifyStatus(page)).toHaveText("Signature verified");
  });
});
