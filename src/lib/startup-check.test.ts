import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { STARTUP_ATTRIBUTE, STARTUP_NOTICE_ID, startupCheckScript } from "./startup-check";

/** Runs the inline script against a minimal fake DOM. */
function run() {
  const notice = { hidden: true };
  const attributes = new Set<string>();
  let onError: ((event: unknown) => void) | undefined;
  let onTimeout: (() => void) | undefined;
  runInNewContext(startupCheckScript, {
    document: {
      documentElement: { hasAttribute: (name: string) => attributes.has(name) },
      getElementById: (id: string) => (id === STARTUP_NOTICE_ID ? notice : null),
    },
    window: { addEventListener: (_type: string, fn: (event: unknown) => void) => (onError = fn) },
    setTimeout: (fn: () => void) => (onTimeout = fn),
  });
  return {
    notice,
    started: () => attributes.add(STARTUP_ATTRIBUTE),
    error: (event: unknown) => onError?.(event),
    timeout: () => onTimeout?.(),
  };
}

describe("startup check", () => {
  it("shows the notice when a site script fails to load", () => {
    const page = run();
    page.error({ target: { src: "https://sprigkit.com/_next/static/chunks/app.js" } });
    expect(page.notice.hidden).toBe(false);
  });

  it("shows the notice when a site script throws while parsing", () => {
    const page = run();
    page.error({ target: null, filename: "https://sprigkit.com/_next/static/chunks/main.js" });
    expect(page.notice.hidden).toBe(false);
  });

  it("ignores errors from other sources", () => {
    const page = run();
    page.error({ target: { src: "blob:https://sprigkit.com/x" } });
    expect(page.notice.hidden).toBe(true);
  });

  it("shows the notice when the app hasn't started in time, not when it has", () => {
    const slow = run();
    slow.timeout();
    expect(slow.notice.hidden).toBe(false);

    const ok = run();
    ok.started();
    ok.timeout();
    ok.error({ target: { src: "/_next/static/chunks/late.js" } });
    expect(ok.notice.hidden).toBe(true);
  });
});
