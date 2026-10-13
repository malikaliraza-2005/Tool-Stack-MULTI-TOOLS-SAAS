"use client";

import { m } from "motion/react";
import { RadioGroup } from "radix-ui";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { slide } from "@/lib/motion";

export type SegmentedOption = { value: string; label: string; disabled?: boolean };

type SegmentedControlProps = {
  /** Accessible name of the group. */
  label: string;
  options: SegmentedOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  size?: "sm" | "md";
  className?: string;
};

/**
 * Mutually exclusive modes, e.g. Encode / Decode (design-system §10.3).
 * Radio semantics: arrow keys move the selection. The selected pill slides
 * between options with a layout animation (§8).
 */
export function SegmentedControl({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
  size = "md",
  className,
}: SegmentedControlProps) {
  const layoutId = useId();
  const [internal, setInternal] = useState(defaultValue ?? options[0]?.value);
  const current = value ?? internal;

  return (
    <RadioGroup.Root
      aria-label={label}
      orientation="horizontal"
      value={current}
      onValueChange={(next) => {
        setInternal(next);
        onValueChange?.(next);
      }}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border border-border bg-surface-2 p-0.5",
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === current;
        return (
          <RadioGroup.Item
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className={cn(
              "relative inline-flex cursor-pointer items-center justify-center rounded-sm px-3 text-ui text-fg-muted transition-control",
              "hover:text-fg data-[state=checked]:text-fg disabled:cursor-not-allowed disabled:opacity-50",
              size === "sm" ? "h-7" : "h-9",
            )}
          >
            {selected && (
              <m.span
                layoutId={layoutId}
                transition={slide}
                aria-hidden
                className="absolute inset-0 rounded-sm border border-border-strong bg-surface shadow-1"
              />
            )}
            <span className="relative">{option.label}</span>
          </RadioGroup.Item>
        );
      })}
    </RadioGroup.Root>
  );
}
