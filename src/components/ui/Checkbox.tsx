"use client";

import { Check, Minus } from "lucide-react";
import { Checkbox as RadixCheckbox } from "radix-ui";
import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type CheckboxProps = ComponentProps<typeof RadixCheckbox.Root> & { label: ReactNode };

export function Checkbox({ label, className, id, ...props }: CheckboxProps) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <RadixCheckbox.Root
        id={checkboxId}
        className={cn(
          "peer inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-border-strong bg-surface text-accent-fg transition-control",
          "hover:border-fg-muted data-[state=checked]:border-accent data-[state=checked]:bg-accent",
          "data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
        {...props}
      >
        <RadixCheckbox.Indicator className="inline-flex">
          {props.checked === "indeterminate" ? (
            <Minus aria-hidden className="size-3.5" />
          ) : (
            <Check aria-hidden className="size-3.5" />
          )}
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      <label
        htmlFor={checkboxId}
        className="cursor-pointer text-ui text-fg peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
      >
        {label}
      </label>
    </div>
  );
}
