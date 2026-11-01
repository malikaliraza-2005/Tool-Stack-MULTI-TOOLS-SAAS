// Supporting content per tool (server components, rendered at build time).
// A published tool without an entry fails the build (app/[tool]/page.tsx).

import type { ComponentType } from "react";
import Base64Content from "./base64-encode-decode/content";
import JsonFormatterContent from "./json-formatter/content";
import MergePdfContent from "./merge-pdf/content";
import UnixTimestampConverterContent from "./unix-timestamp-converter/content";
import UrlEncodeDecodeContent from "./url-encode-decode/content";
import UuidGeneratorContent from "./uuid-generator/content";
import HashGeneratorContent from "./hash-generator/content";
import JwtDecoderContent from "./jwt-decoder/content";
import DiffCheckerContent from "./diff-checker/content";
import RegexTesterContent from "./regex-tester/content";
import SplitPdfContent from "./split-pdf/content";
import OrganizePdfContent from "./organize-pdf/content";
import JpgToPdfContent from "./jpg-to-pdf/content";
import PdfToJpgContent from "./pdf-to-jpg/content";
import SignPdfContent from "./sign-pdf/content";
import RemoveExifDataContent from "./remove-exif-data/content";

export const TOOL_CONTENT: Record<string, ComponentType> = {
  "base64-encode-decode": Base64Content,
  "json-formatter": JsonFormatterContent,
  "merge-pdf": MergePdfContent,
  "unix-timestamp-converter": UnixTimestampConverterContent,
  "url-encode-decode": UrlEncodeDecodeContent,
  "uuid-generator": UuidGeneratorContent,
  "hash-generator": HashGeneratorContent,
  "jwt-decoder": JwtDecoderContent,
  "diff-checker": DiffCheckerContent,
  "regex-tester": RegexTesterContent,
  "split-pdf": SplitPdfContent,
  "organize-pdf": OrganizePdfContent,
  "jpg-to-pdf": JpgToPdfContent,
  "pdf-to-jpg": PdfToJpgContent,
  "sign-pdf": SignPdfContent,
  "remove-exif-data": RemoveExifDataContent,
};
