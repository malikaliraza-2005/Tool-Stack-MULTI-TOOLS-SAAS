"use client";

import { X } from "lucide-react";
import { Dialog as RadixDialog } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconButton } from "./IconButton";

// Radix Dialog traps focus, closes on Esc and returns focus to the trigger
// on close (design-system §7.4 rule 6, §8).
export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

// Without a description, Radix needs an explicit `aria-describedby={undefined}`.
const noDescription = (description: ReactNode) =>
  description ? {} : { "aria-describedby": undefined };

function DialogOverlay() {
  return (
    <RadixDialog.Overlay className="fixed inset-0 z-50 bg-overlay animate-fade-in data-[state=closed]:animate-fade-out" />
  );
}

type DialogContentProps = ComponentProps<typeof RadixDialog.Content> & {
  title: ReactNode;
  description?: ReactNode;
  /** Visually hide the title (it stays the dialog's accessible name). */
  hideTitle?: boolean;
  /** Hide the close button, e.g. when the content has its own. */
  hideClose?: boolean;
  /** `sm`+ placement: centered, or near the top (command palette). */
  placement?: "center" | "top";
  /** `sm`+ max width. */
  width?: "dialog" | "palette";
  /** No padding or gap: the content lays itself out (command palette). */
  bare?: boolean;
};

function DialogHeader({
  title,
  description,
  hideTitle,
}: Pick<DialogContentProps, "title" | "description" | "hideTitle">) {
  return (
    <div className={cn("flex flex-col gap-1 pr-10", hideTitle && "sr-only")}>
      <RadixDialog.Title className="text-h3 text-fg">{title}</RadixDialog.Title>
      {description ? (
        <RadixDialog.Description className="text-small text-fg-muted">
          {description}
        </RadixDialog.Description>
      ) : null}
    </div>
  );
}

function CloseButton() {
  return (
    // Positioned by a wrapper: the button itself is `relative`.
    <div className="absolute top-3 right-3">
      <RadixDialog.Close asChild>
        <IconButton label="Close" icon={<X aria-hidden />} size="sm" tooltip={false} />
      </RadixDialog.Close>
    </div>
  );
}

/**
 * Centered dialog on `sm` and up; a bottom sheet on small screens
 * (design-system §8).
 */
export function DialogContent({
  title,
  description,
  hideTitle,
  hideClose,
  placement = "center",
  width = "dialog",
  bare = false,
  className,
  children,
  ...props
}: DialogContentProps) {
  return (
    <RadixDialog.Portal>
      <DialogOverlay />
      <RadixDialog.Content
        {...noDescription(description)}
        className={cn(
          "fixed z-50 flex flex-col overflow-y-auto border border-border bg-surface text-fg shadow-3 outline-none",
          !bare && "gap-4 p-6",
          // Mobile: bottom sheet.
          "inset-x-0 bottom-0 max-h-(--sheet-max-height) rounded-t-lg",
          "animate-sheet-in-bottom data-[state=closed]:animate-sheet-out-bottom",
          // sm+: centered dialog.
          "sm:inset-x-4 sm:bottom-auto sm:mx-auto sm:w-auto sm:rounded-lg",
          width === "dialog" ? "sm:max-w-dialog" : "sm:max-w-palette",
          placement === "center" ? "sm:top-1/2 sm:-translate-y-1/2" : "sm:top-24",
          "sm:animate-dialog-in sm:data-[state=closed]:animate-dialog-out",
          className,
        )}
        {...props}
      >
        <DialogHeader title={title} description={description} hideTitle={hideTitle} />
        {children}
        {!hideClose && <CloseButton />}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

/** Side sheet: slides in from the right edge, full height (e.g. mobile navigation). */
export function SheetContent({
  title,
  description,
  hideTitle,
  hideClose,
  className,
  children,
  ...props
}: Omit<DialogContentProps, "placement" | "width" | "bare">) {
  return (
    <RadixDialog.Portal>
      <DialogOverlay />
      <RadixDialog.Content
        {...noDescription(description)}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-dialog flex-col gap-4 overflow-y-auto border-l border-border bg-surface p-6 text-fg shadow-3 outline-none",
          "animate-sheet-in-right data-[state=closed]:animate-sheet-out-right",
          className,
        )}
        {...props}
      >
        <DialogHeader title={title} description={description} hideTitle={hideTitle} />
        {children}
        {!hideClose && <CloseButton />}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}
