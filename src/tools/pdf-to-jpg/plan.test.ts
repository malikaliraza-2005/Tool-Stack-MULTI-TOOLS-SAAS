import { describe, expect, it } from "vitest";
import { imageName, MAX_PIXELS, renderSize, zipName } from "./plan";

const A4: [number, number] = [595.28, 841.89];

describe("renderSize", () => {
  it("matches DPI × page size", () => {
    // A4 is 8.27 × 11.69 inches.
    expect(renderSize(...A4, 72, MAX_PIXELS.desktop)).toMatchObject({
      width: 595,
      height: 841,
      dpi: 72,
      downscaled: false,
    });
    expect(renderSize(...A4, 150, MAX_PIXELS.desktop)).toMatchObject({
      width: 1240,
      height: 1753,
      dpi: 150,
    });
    expect(renderSize(...A4, 300, MAX_PIXELS.desktop)).toMatchObject({
      width: 2480,
      height: 3507,
      dpi: 300,
    });
  });

  it("reduces large pages to the device limit, keeping the aspect ratio", () => {
    // A1 (1684 × 2384 pt) at 300 DPI is ~49.6 megapixels: over the phone limit.
    const size = renderSize(1684, 2384, 300, MAX_PIXELS.mobile);
    expect(size.downscaled).toBe(true);
    expect(size.width * size.height).toBeLessThanOrEqual(MAX_PIXELS.mobile);
    expect(size.width / size.height).toBeCloseTo(1684 / 2384, 2);
    expect(size.dpi).toBeLessThan(300);
    expect(size.dpi).toBe(Math.round(size.scale * 72));
    // The same page fits the desktop limit.
    expect(renderSize(1684, 2384, 300, MAX_PIXELS.desktop).downscaled).toBe(false);
  });

  it("never returns an empty image", () => {
    expect(renderSize(0.1, 0.1, 72, MAX_PIXELS.mobile)).toMatchObject({ width: 1, height: 1 });
  });
});

describe("names", () => {
  it("names images after the PDF and page", () => {
    expect(imageName("Annual Report.pdf", 3, "jpg")).toBe("Annual Report-page-3.jpg");
    expect(imageName("scan.v2.pdf", 12, "png")).toBe("scan.v2-page-12.png");
    expect(zipName("Annual Report.pdf")).toBe("Annual Report-images.zip");
  });
});
