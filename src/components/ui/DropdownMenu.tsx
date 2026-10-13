"use client";

import { Check } from "lucide-react";
import { DropdownMenu as RadixMenu } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { Kbd } from "./Kbd";
import { floatingSurfaceClasses, menuItemClasses } from "./menu-styles";

export const DropdownMenu = RadixMenu.Root;
export const DropdownMenuTrigger = RadixMenu.Trigger;
export const DropdownMenuGroup = RadixMenu.Group;
export const DropdownMenuRadioGroup = RadixMenu.RadioGroup;

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  align = "end",
  ...props
}: ComponentProps<typeof RadixMenu.Content>) {
  return (
    <RadixMenu.Portal>
      <RadixMenu.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          floatingSurfaceClasses,
          "min-w-48 p-1 origin-(--radix-dropdown-menu-content-transform-origin)",
          className,
        )}
        {...props}
      />
    </RadixMenu.Portal>
  );
}

export function DropdownMenuItem({
  className,
  shortcut,
  children,
  ...props
}: ComponentProps<typeof RadixMenu.Item> & { shortcut?: string }) {
  return (
    <RadixMenu.Item className={cn(menuItemClasses, className)} {...props}>
      {children}
      {shortcut && <Kbd className="ml-auto">{shortcut}</Kbd>}
    </RadixMenu.Item>
  );
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: ComponentProps<typeof RadixMenu.CheckboxItem>) {
  return (
    <RadixMenu.CheckboxItem className={cn(menuItemClasses, "pl-8", className)} {...props}>
      <RadixMenu.ItemIndicator className="absolute left-2 inline-flex text-accent-text">
        <Check aria-hidden />
      </RadixMenu.ItemIndicator>
      {children}
    </RadixMenu.CheckboxItem>
  );
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof RadixMenu.RadioItem>) {
  return (
    <RadixMenu.RadioItem className={cn(menuItemClasses, "pl-8", className)} {...props}>
      <RadixMenu.ItemIndicator className="absolute left-2 inline-flex text-accent-text">
        <Check aria-hidden />
      </RadixMenu.ItemIndicator>
      {children}
    </RadixMenu.RadioItem>
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof RadixMenu.Label>) {
  return (
    <RadixMenu.Label
      className={cn("px-2 pt-2 pb-1 text-micro text-fg-muted uppercase", className)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof RadixMenu.Separator>) {
  return <RadixMenu.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}
