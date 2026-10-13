"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./Button";
import { notify } from "./Toast";
import { Tooltip } from "./Tooltip";

const COPIED_MS = 1500;

type CopyButtonProps = {
  /** Text to copy, or a function that returns it at click time. */
  value: string | (() => string);
  /** Names what is copied, e.g. "Copy JSON". */
  label?: string;
  /** Icon only (with tooltip) instead of icon + text. */
  iconOnly?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  className?: string;
};

/**
 * Copies text to the clipboard. The icon morphs to a check for 1.5s and
 * "Copied" is announced to screen readers (design-system §8).
 */
export function CopyButton({
  value,
  label = "Copy",
  iconOnly = false,
  variant = "secondary",
  size = "md",
  disabled,
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(typeof value === "function" ? value() : value);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), COPIED_MS);
    } catch {
      notify.error("Couldn't copy to the clipboard", {
        description:
          "Your browser blocked clipboard access. Select the text and press Ctrl+C (⌘C).",
      });
    }
  }

  const icon = (
    <span aria-hidden className="relative inline-flex">
      <Copy
        className={cn(
          "transition-control",
          copied ? "scale-50 opacity-0" : "scale-100 opacity-100",
        )}
      />
      <Check
        className={cn(
          "absolute inset-0 text-success transition-control",
          copied ? "scale-100 opacity-100" : "scale-50 opacity-0",
        )}
      />
    </span>
  );

  const button = (
    <button
      type="button"
      onClick={copy}
      disabled={disabled}
      aria-label={iconOnly ? label : undefined}
      className={buttonClasses({ variant, size, iconOnly, className })}
    >
      {icon}
      {!iconOnly && <span>{copied ? "Copied" : label}</span>}
    </button>
  );

  return (
    <>
      {iconOnly && !disabled ? (
        <Tooltip content={copied ? "Copied" : label}>{button}</Tooltip>
      ) : (
        button
      )}
      <span role="status" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </>
  );
}
