import { makePng } from "../src/lib/files/__fixtures__/images";
import { A4, makePdf } from "../src/lib/pdf/__fixtures__/pdfs";
import { expect, test } from "./fixtures";

// "Use in another tool" (G-11): a result opens in a registry `handoff`
// target with the file already added, in memory and without any request.

const pdf = async (name: string) => ({
  name,
  mimeType: "application/pdf",
  buffer: Buffer.from(await makePdf(name, [A4])),
});

test.describe("use in another tool", () => {
  test.beforeEach(({ browserName }) => test.slow(browserName === "webkit"));

  test("a merged PDF opens in Split PDF", async ({ page }) => {
    await page.goto("/merge-pdf");
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles([await pdf("a.pdf"), await pdf("b.pdf")]);
    await page.getByRole("button", { name: "Merge 2 PDFs" }).click();
    await expect(page.getByRole("heading", { name: "merged.pdf is ready" })).toBeVisible();

    await page.getByRole("button", { name: "Use in another tool" }).click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem")).toHaveText([
      "Organize PDF",
      "Fill & Sign PDF",
      "Split PDF",
    ]);
    await menu.getByRole("menuitem", { name: "Split PDF" }).click();

    await expect(page).toHaveURL(/\/split-pdf$/);
    await expect(page.getByText("merged.pdf")).toBeVisible();
  });

  test("a compressed image opens in JPG to PDF", async ({ page }) => {
    await page.goto("/compress-image");
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: "photo.png",
        mimeType: "image/png",
        buffer: Buffer.from(makePng(64, 64, (x, y) => [x * 4, y * 4, 128, 255])),
      });
    await page.getByRole("button", { name: "Compress image" }).click();
    await expect(
      page.getByRole("heading", { name: "photo-compressed.png is ready" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Use in another tool" }).click();
    await page.getByRole("menuitem", { name: "JPG to PDF" }).click();

    await expect(page).toHaveURL(/\/jpg-to-pdf$/);
    await expect(page.getByText("photo-compressed.png").first()).toBeVisible();
  });
});
