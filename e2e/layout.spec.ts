import { A4, makePdf } from "../src/tools/merge-pdf/__fixtures__/pdfs";
import { expect, horizontalOverflow, test } from "./fixtures";

// Narrowest supported phone (320px). The noOverflow fixture also checks the
// final state of every other test; this covers the states most likely to
// push content sideways: long file names, long unbroken text, results.

test.use({ viewport: { width: 320, height: 640 } });

const fits = async (page: Parameters<typeof horizontalOverflow>[0]) =>
  expect(await horizontalOverflow(page), "elements wider than the viewport").toEqual([]);

for (const path of ["/", "/merge-pdf", "/json-formatter", "/does-not-exist"]) {
  test(`${path} fits a 320px screen`, async ({ page }) => {
    await page.goto(path);
    await fits(page);
  });
}

test("merge-pdf fits a 320px screen with long file names and a result", async ({ page }) => {
  await page.goto("/merge-pdf");
  const pdf = async (name: string) => ({
    name,
    mimeType: "application/pdf",
    buffer: Buffer.from(await makePdf(name, [A4])),
  });
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles([
      await pdf("Salary_Slip_February_2026_final_signed_copy_for_records.pdf"),
      await pdf("Salary Slip November 2025.pdf"),
    ]);
  await expect(
    page.getByRole("list", { name: "Files to merge, in order" }).getByRole("listitem"),
  ).toHaveCount(2);
  await fits(page);

  await page.getByRole("button", { name: "Merge 2 PDFs" }).click();
  await expect(page.getByText(/is ready/)).toBeVisible();
  await fits(page);
});

test("json-formatter fits a 320px screen with long lines and the tree", async ({ page }) => {
  await page.goto("/json-formatter");
  const input = page.getByRole("textbox", { name: "JSON input" });
  await input.focus();
  await expect(page.locator(".cm-editor").first()).toBeVisible();
  const long = "x".repeat(300);
  await input.fill(JSON.stringify({ [long]: long, list: [long, { nested: long }] }));
  await expect(page.getByText("Valid JSON", { exact: true })).toBeVisible();
  await fits(page);

  await page.getByRole("radio", { name: "Tree" }).click();
  await expect(page.getByRole("tree", { name: "JSON tree" })).toBeVisible();
  await fits(page);
});
