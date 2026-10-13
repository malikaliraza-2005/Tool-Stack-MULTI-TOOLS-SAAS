"use client";

import { Check, ChevronDown } from "lucide-react";
import { Select as RadixSelect } from "radix-ui";
import { cn } from "@/lib/cn";
import { fieldControlClasses, useFieldControl } from "./Field";
import { floatingSurfaceClasses, menuItemClasses } from "./menu-styles";

export type SelectOption = { value: string; label: string; disabled?: boolean };

type SelectProps = {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Required when the select is not inside a <Field>. */
  "aria-label"?: string;
  className?: string;
};

export function Select({
  options,
  placeholder,
  className,
  "aria-label": ariaLabel,
  ...rootProps
}: SelectProps) {
  const field = useFieldControl();
  return (
    <RadixSelect.Root {...rootProps}>
      <RadixSelect.Trigger
        id={field?.id}
        aria-label={ariaLabel}
        aria-describedby={field?.describedBy}
        aria-invalid={field?.invalid || undefined}
        className={cn(
          fieldControlClasses,
          "inline-flex h-10 cursor-pointer items-center justify-between gap-2 px-3 text-left",
          "data-placeholder:text-fg-subtle",
          className,
        )}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon>
          <ChevronDown aria-hidden className="size-4 text-fg-muted" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className={cn(
            floatingSurfaceClasses,
            "max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-hidden",
            "origin-(--radix-select-content-transform-origin)",
          )}
        >
          <RadixSelect.Viewport className="p-1">
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={cn(menuItemClasses, "pr-8")}
              >
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="absolute right-2 inline-flex text-accent-text">
                  <Check aria-hidden />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
