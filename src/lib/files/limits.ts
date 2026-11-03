// Size and count limits from the registry, checked before any file is read
// (tool-specifications §2.1, architecture §8.3).

import { toolErrors, type ToolError } from "@/lib/errors";
import type { ToolLimits } from "@/tools/types";
import { formatBytes } from "./format";

export type DeviceClass = "desktop" | "mobile";

type NavigatorWithUAData = Pick<Navigator, "userAgent" | "maxTouchPoints"> & {
  userAgentData?: { mobile?: boolean };
};

/** Phones and tablets get the lower mobile limits (mvp-scope §4). */
export function getDeviceClass(nav?: NavigatorWithUAData): DeviceClass {
  const n = nav ?? (typeof navigator === "undefined" ? undefined : navigator);
  if (!n) return "desktop";
  const uaData = (n as NavigatorWithUAData).userAgentData;
  if (typeof uaData?.mobile === "boolean" && uaData.mobile) return "mobile";
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(n.userAgent)) return "mobile";
  // iPadOS reports a desktop Mac user agent; touch support gives it away.
  if (/Macintosh/.test(n.userAgent) && n.maxTouchPoints > 1) return "mobile";
  return "desktop";
}

export type LimitCheck =
  { status: "ok" } | { status: "warn"; message: string } | { status: "reject"; error: ToolError };

type SizedFile = { name: string; size: number };

/**
 * Checks files against the tool's limits without reading them. With
 * `per: "total"` the files count together with `existing` (files already
 * accepted) in order, so the first files that fit are accepted and later
 * ones rejected.
 */
export function checkLimits(
  files: readonly SizedFile[],
  limits: ToolLimits,
  device: DeviceClass,
  existing: { count: number; bytes: number } = { count: 0, bytes: 0 },
): LimitCheck[] {
  const { softBytes, hardBytes, maxFiles } = limits[device];
  const total = limits.per === "total";
  const where = device === "mobile" ? "on phones and tablets" : "on this device";
  let count = existing.count;
  let bytes = existing.bytes;

  return files.map((file): LimitCheck => {
    if (maxFiles !== undefined && count >= maxFiles) {
      return {
        status: "reject",
        error: toolErrors.tooManyFiles({ name: file.name, max: maxFiles }),
      };
    }
    const measured = total ? bytes + file.size : file.size;
    if (measured > hardBytes) {
      return {
        status: "reject",
        error: total
          ? toolErrors.totalTooLarge({ name: file.name, total: measured, limit: hardBytes })
          : toolErrors.tooLarge({
              name: file.name,
              size: file.size,
              limit: hardBytes,
              suggestion: "a smaller file, or a desktop browser",
            }),
      };
    }
    count += 1;
    bytes += file.size;
    if (measured > softBytes) {
      return {
        status: "warn",
        message: total
          ? `The files add up to ${formatBytes(measured)}. This may be slow ${where}.`
          : `${file.name} is ${formatBytes(file.size)}. This may be slow ${where}.`,
      };
    }
    return { status: "ok" };
  });
}

/** UTF-8 size of a string without allocating its encoding. */
export function utf8Length(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        i += 1;
      } else bytes += 3;
    } else bytes += 3;
  }
  return bytes;
}

/**
 * Checks pasted or typed text against the tool's limits (its UTF-8 size, as
 * if saved to a file). Lengths that can't cross a limit skip the count.
 */
export function checkTextLimits(text: string, limits: ToolLimits, device: DeviceClass): LimitCheck {
  const { softBytes, hardBytes } = limits[device];
  if (text.length * 3 <= softBytes) return { status: "ok" };
  const size = utf8Length(text);
  if (size > hardBytes) {
    return { status: "reject", error: toolErrors.textTooLarge({ size, limit: hardBytes }) };
  }
  if (size > softBytes) {
    const where = device === "mobile" ? "on phones and tablets" : "on this device";
    return {
      status: "warn",
      message: `The text is ${formatBytes(size)}. This may be slow ${where}.`,
    };
  }
  return { status: "ok" };
}
