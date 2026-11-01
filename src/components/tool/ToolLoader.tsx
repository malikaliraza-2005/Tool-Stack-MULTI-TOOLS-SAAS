"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

/**
 * Lazy-loads each tool's `ui.tsx` as its own chunk (architecture §7), so a
 * tool page only ships its own UI. The UI is still rendered at build time,
 * so the static HTML shows the real workspace and nothing shifts when it
 * hydrates. Heavy libraries load later, on intent, inside each UI.
 */
const TOOL_UIS: Record<string, ComponentType> = {
  "base64-encode-decode": dynamic(() => import("@/tools/base64-encode-decode/ui")),
  "json-formatter": dynamic(() => import("@/tools/json-formatter/ui")),
  "merge-pdf": dynamic(() => import("@/tools/merge-pdf/ui")),
  "unix-timestamp-converter": dynamic(() => import("@/tools/unix-timestamp-converter/ui")),
  "url-encode-decode": dynamic(() => import("@/tools/url-encode-decode/ui")),
  "uuid-generator": dynamic(() => import("@/tools/uuid-generator/ui")),
  "hash-generator": dynamic(() => import("@/tools/hash-generator/ui")),
  "jwt-decoder": dynamic(() => import("@/tools/jwt-decoder/ui")),
  "diff-checker": dynamic(() => import("@/tools/diff-checker/ui")),
  "regex-tester": dynamic(() => import("@/tools/regex-tester/ui")),
  "split-pdf": dynamic(() => import("@/tools/split-pdf/ui")),
  "organize-pdf": dynamic(() => import("@/tools/organize-pdf/ui")),
};

export function ToolLoader({ slug }: { slug: string }) {
  const UI = TOOL_UIS[slug];
  // Thrown at build time, so a registered tool without a UI fails the build.
  if (!UI) throw new Error(`No UI for tool "${slug}". Add it to ToolLoader (tool-registry §7).`);
  return <UI />;
}
