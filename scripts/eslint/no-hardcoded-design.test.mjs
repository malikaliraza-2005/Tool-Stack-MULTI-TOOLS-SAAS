import { RuleTester } from "eslint";
import { describe, expect, it } from "vitest";
import { checkClass, noHardcodedDesign } from "./no-hardcoded-design.mjs";

RuleTester.describe = describe;
RuleTester.it = it;

describe("checkClass", () => {
  it.each([
    "bg-surface",
    "text-fg-muted",
    "hover:bg-accent-hover",
    "duration-(--dur-quick)",
    "max-h-(--sheet-max-height)",
    "w-[var(--width)]",
    "data-[state=open]:animate-pop-in",
    "[&_svg]:size-4",
    "transition-[opacity,transform]",
    "gap-[inherit]",
    "size-4",
    "grid-cols-[1fr_auto]",
    "scale-98",
  ])("allows %s", (token) => {
    expect(checkClass(token)).toBeNull();
  });

  it.each([
    "w-[37px]",
    "bg-[#fff]",
    "text-[oklch(0.5_0.1_20)]",
    "hover:duration-[250ms]",
    "ease-[cubic-bezier(0.2,0,0,1)]",
    "duration-200",
    "delay-75",
    "text-red-500",
    "bg-white",
    "sm:border-slate-200/50",
    "top-[calc(100%-2rem)]",
  ])("rejects %s", (token) => {
    expect(checkClass(token)).not.toBeNull();
  });
});

new RuleTester({
  languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
}).run("no-hardcoded-design", noHardcodedDesign, {
  valid: [
    `<div className="bg-surface text-fg" />`,
    `<div style={{ transform: \`scaleX(\${value})\` }} />`,
    `<div style={{ width: "var(--x)" }} />`,
    `const label = "Compressed 1.2 MB to 340 KB";`,
  ],
  invalid: [
    { code: `<div className="w-[13px]" />`, errors: [{ messageId: "classValue" }] },
    { code: "cn(`p-4 ${a} duration-300`)", errors: [{ messageId: "classValue" }] },
    { code: `<div style={{ color: "#ff0000" }} />`, errors: [{ messageId: "styleValue" }] },
    { code: `<div style={{ padding: "12px" }} />`, errors: [{ messageId: "styleValue" }] },
  ],
});
