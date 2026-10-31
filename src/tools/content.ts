// Supporting content per tool (server components, rendered at build time).
// A published tool without an entry fails the build (app/[tool]/page.tsx).

import type { ComponentType } from "react";
import Base64Content from "./base64-encode-decode/content";
import JsonFormatterContent from "./json-formatter/content";
import MergePdfContent from "./merge-pdf/content";
import UnixTimestampConverterContent from "./unix-timestamp-converter/content";

export const TOOL_CONTENT: Record<string, ComponentType> = {
  "base64-encode-decode": Base64Content,
  "json-formatter": JsonFormatterContent,
  "merge-pdf": MergePdfContent,
  "unix-timestamp-converter": UnixTimestampConverterContent,
};
