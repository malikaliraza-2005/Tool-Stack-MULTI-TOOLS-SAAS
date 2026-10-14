// Supporting content per tool (server components, rendered at build time).
// A published tool without an entry fails the build (app/[tool]/page.tsx).

import type { ComponentType } from "react";
import JsonFormatterContent from "./json-formatter/content";
import MergePdfContent from "./merge-pdf/content";

export const TOOL_CONTENT: Record<string, ComponentType> = {
  "json-formatter": JsonFormatterContent,
  "merge-pdf": MergePdfContent,
};
