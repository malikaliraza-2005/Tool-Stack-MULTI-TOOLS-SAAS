import type { Page } from "@playwright/test";
import { makeJpegBytes, makePdf, A4 } from "../src/lib/pdf/__fixtures__/pdfs";
import { expect, expectNoA11yViolations, test } from "./fixtures";

// Homepage (Phase 7): instrument hero with drop suggestions (G-2) and smart
// paste (G-3), the index, and hand-off of input to the chosen tool. The
// noNetwork fixture proves nothing leaves the device on the way.

const search = (page: Page) => page.getByRole("combobox", { name: "Search tools" });

async function ready(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-app-started"));
}

/** Pastes text as the user would, into the hero's search field. */
async function paste(page: Page, text: string) {
  await search(page).focus();
  await search(page).evaluate((input, value) => {
    const data = new DataTransfer();
    data.setData("text/plain", value);
    // Firefox ignores `clipboardData` in the ClipboardEvent constructor.
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    input.dispatchEvent(event);
  }, text);
}

async function chooseFiles(
  page: Page,
  files: { name: string; mimeType: string; buffer: Buffer }[],
) {
  await page.locator('input[type="file"]').first().setInputFiles(files);
}

const pdf = async (name: string) => ({
  name,
  mimeType: "application/pdf",
  buffer: Buffer.from(await makePdf(name, [A4])),
});

test.describe("homepage", () => {
  test("is accessible in both themes and lists every tool", async ({ page }) => {
    await ready(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Private tools for PDFs, images and code",
    );
    const index = page.getByRole("region", { name: "All tools" });
    await expect(index.getByRole("listitem")).toHaveCount(19);
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await expectNoA11yViolations(page);
    }
  });

  test("search finds a tool and opens it with the keyboard", async ({ page }) => {
    await ready(page);
    await search(page).fill("combine pdf");
    await expect(page.getByRole("option", { name: /Merge PDF/ })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/merge-pdf$/);
  });

  test("a dropped PDF is offered to the PDF tools and handed over", async ({ page }) => {
    await ready(page);
    await chooseFiles(page, [await pdf("contract.pdf")]);
    const suggestions = page.getByRole("region", { name: "Open contract.pdf in" });
    await expect(suggestions.getByRole("heading")).toBeFocused();
    await expect(suggestions.getByRole("button", { name: "Clear" })).toBeVisible();
    await expect(suggestions.getByRole("listitem")).toHaveText([
      /Merge PDF/,
      /Split PDF/,
      /Organize PDF/,
      /PDF to JPG/,
      /Fill & Sign PDF/,
    ]);
    await expectNoA11yViolations(page);
    await suggestions.getByRole("button", { name: /Split PDF/ }).click();
    await expect(page).toHaveURL(/\/split-pdf$/);
    await expect(page.getByText("contract.pdf")).toBeVisible();
  });

  test("a photo is offered to the image tools and handed over", async ({ page }) => {
    await ready(page);
    await chooseFiles(page, [
      { name: "photo.jpg", mimeType: "image/jpeg", buffer: Buffer.from(makeJpegBytes()) },
    ]);
    const suggestions = page.getByRole("region", { name: "Open photo.jpg in" });
    await expect(suggestions.getByRole("button", { name: /Compress Image/ })).toBeVisible();
    await expect(suggestions.getByRole("button", { name: /Merge PDF/ })).toHaveCount(0);
    await suggestions.getByRole("button", { name: /Compress Image/ }).click();
    await expect(page).toHaveURL(/\/compress-image$/);
    await expect(page.getByText("photo.jpg").first()).toBeVisible();
  });

  test("an unsupported file is offered only to the any-file tools", async ({ page }) => {
    await ready(page);
    await chooseFiles(page, [
      { name: "archive.zip", mimeType: "application/zip", buffer: Buffer.from("PK\x03\x04data") },
    ]);
    const suggestions = page.getByRole("region", { name: "Open archive.zip in" });
    await expect(suggestions).toContainText("No tool here converts this type of file");
    await expect(suggestions.getByRole("button", { name: /Hash Generator/ })).toBeVisible();
    await expect(suggestions.getByRole("button", { name: /Base64/ })).toBeVisible();
    await expect(suggestions.getByRole("button", { name: /Compress|Merge/ })).toHaveCount(0);
  });

  const jwt =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

  test("pasting a JWT opens the decoder pre-filled", async ({ page }) => {
    await ready(page);
    await paste(page, jwt);
    await expect(page).toHaveURL(/\/jwt-decoder$/);
    await expect(page.getByRole("main")).toContainText("John Doe");
  });

  test("pasting JSON opens the formatter pre-filled", async ({ page }) => {
    await ready(page);
    await paste(page, '{"name":"Sprigkit","tools":19}');
    await expect(page).toHaveURL(/\/json-formatter$/);
    await expect(page.getByRole("main")).toContainText('"Sprigkit"');
  });

  test("pasting a timestamp opens the converter pre-filled", async ({ page }) => {
    await ready(page);
    await paste(page, "1700000000");
    await expect(page).toHaveURL(/\/unix-timestamp-converter$/);
    await expect(page.getByRole("textbox", { name: "Unix timestamp" })).toHaveValue("1700000000");
  });

  test("pasting a URL opens the URL parser pre-filled", async ({ page }) => {
    await ready(page);
    await paste(page, "https://example.com/search?q=private%20tools");
    await expect(page).toHaveURL(/\/url-encode-decode$/);
    await expect(page.getByRole("radio", { name: "Parse" })).toBeChecked();
    await expect(page.getByRole("main")).toContainText("example.com");
  });

  test("pasting Base64 opens the decoder pre-filled", async ({ page }) => {
    await ready(page);
    await paste(page, "U3ByaWdraXQgcnVucyBpbiB5b3VyIGJyb3dzZXIu");
    await expect(page).toHaveURL(/\/base64-encode-decode$/);
    await expect(page.getByRole("radio", { name: "Decode" })).toBeChecked();
    await expect(page.getByRole("main")).toContainText("Sprigkit runs in your browser.");
  });

  test("ordinary pasted text stays in the search field", async ({ page }) => {
    await ready(page);
    await search(page).focus();
    await page.keyboard.insertText("merge pdf");
    await expect(page).toHaveURL(/\/$/);
    await expect(search(page)).toHaveValue("merge pdf");
  });
});

test.describe("category hubs", () => {
  for (const [path, name, count] of [
    ["/pdf-tools", "PDF tools", 6],
    ["/image-tools", "Image tools", 4],
    ["/developer-tools", "Developer tools", 9],
  ] as const) {
    test(`${path} lists its tools`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
      await expect(page.getByRole("heading", { name: `${count} ${name}` })).toBeVisible();
      const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
      expect(jsonLd).toContain("CollectionPage");
      await expectNoA11yViolations(page);
    });
  }
});
