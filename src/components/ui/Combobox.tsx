"use client";

import { Command } from "cmdk";
import { Check, ChevronsUpDown } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { fieldControlClasses, useFieldControl } from "./Field";
import { commandItemClasses } from "./menu-styles";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";

export type ComboboxOption = { value: string; label: string; keywords?: string[] };

type ComboboxProps = {
  options: ComboboxOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  /** Shown when nothing matches; tell the user what to try next. */
  emptyText?: string;
  disabled?: boolean;
  /** Required when the combobox is not inside a <Field>. */
  "aria-label"?: string;
  className?: string;
};

/** Searchable select (design-system §8): a popover with a filtered list. */
export function Combobox({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No matches. Try a shorter search.",
  disabled,
  "aria-label": ariaLabel,
  className,
}: ComboboxProps) {
  const field = useFieldControl();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;
  const selected = options.find((option) => option.value === current);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={field?.id}
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        aria-describedby={field?.describedBy}
        aria-invalid={field?.invalid || undefined}
        disabled={disabled}
        className={cn(
          fieldControlClasses,
          "inline-flex h-10 cursor-pointer items-center justify-between gap-2 px-3 text-left",
          !selected && "text-fg-subtle",
          className,
        )}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-fg-muted" />
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-popover p-0">
        <Command loop>
          <Command.Input
            placeholder={searchPlaceholder}
            className="h-10 w-full border-b border-border bg-transparent px-3 text-body text-fg outline-none placeholder:text-fg-subtle"
          />
          <Command.List id={listId} className="max-h-64 overflow-y-auto p-1">
            <Command.Empty className="px-2 py-3 text-small text-fg-muted">
              {emptyText}
            </Command.Empty>
            {options.map((option) => (
              <Command.Item
                key={option.value}
                value={option.value}
                keywords={[option.label, ...(option.keywords ?? [])]}
                onSelect={() => {
                  setInternal(option.value);
                  onValueChange?.(option.value);
                  setOpen(false);
                }}
                className={cn(commandItemClasses, "pr-8")}
              >
                {option.label}
                {option.value === current && (
                  <Check aria-hidden className="absolute right-2 text-accent-text" />
                )}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
