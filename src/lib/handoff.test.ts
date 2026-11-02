import { afterEach, describe, expect, it } from "vitest";
import { clearHandoff, handOff, takeHandoff } from "./handoff";

describe("in-memory hand-off (architecture §9)", () => {
  afterEach(() => clearHandoff());

  it("gives the input to the target tool once", () => {
    const file = new File(["%PDF-"], "a.pdf", { type: "application/pdf" });
    handOff("merge-pdf", { files: [file], source: "home" });
    expect(takeHandoff("merge-pdf")).toEqual({ files: [file], source: "home" });
    expect(takeHandoff("merge-pdf")).toBeUndefined();
  });

  it("keeps the input from other tools", () => {
    handOff("jwt-decoder", { text: "eyJ…", source: "jwt" });
    expect(takeHandoff("json-formatter")).toBeUndefined();
    expect(takeHandoff("jwt-decoder")?.text).toBe("eyJ…");
  });

  it("replaces an earlier hand-off", () => {
    handOff("json-formatter", { text: "{}" });
    handOff("jwt-decoder", { text: "eyJ…" });
    expect(takeHandoff("json-formatter")).toBeUndefined();
  });
});
