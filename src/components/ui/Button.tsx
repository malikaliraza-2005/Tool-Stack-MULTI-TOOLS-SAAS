import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

// design-system §8: primary (accent fill), secondary (surface + border), ghost, danger.
const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover",
  secondary:
    "border border-border bg-surface text-fg shadow-1 hover:bg-surface-2 active:bg-surface-3",
  ghost: "text-fg hover:bg-surface-2 active:bg-surface-3",
  danger: "bg-danger text-danger-fg hover:bg-danger-hover",
};

// sm 32px · md 40px · lg 48px.
const sizes: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-3 text-ui [&_svg]:size-4",
  md: "h-10 gap-2 px-4 text-ui [&_svg]:size-4",
  lg: "h-12 gap-2 px-5 text-body font-medium [&_svg]:size-5",
};

// Square, no horizontal padding.
const iconButtonSizes: Record<ButtonSize, string> = {
  sm: "size-8 [&_svg]:size-4",
  md: "size-10 [&_svg]:size-5",
  lg: "size-12 [&_svg]:size-6",
};

export function buttonClasses({
  variant = "secondary",
  size = "md",
  iconOnly = false,
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; iconOnly?: boolean; className?: string } = {}) {
  return cn(
    "relative inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-md select-none",
    "transition-control active:scale-98 [&_svg]:shrink-0",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    // Loading is busy, not unavailable: keep full strength.
    "aria-busy:opacity-100",
    variants[variant],
    iconOnly ? iconButtonSizes[size] : sizes[size],
    className,
  );
}

export type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, keeps the button's width and blocks clicks. */
  loading?: boolean;
  /** Renders the child element (e.g. a link) with button styles. */
  asChild?: boolean;
};

export function Button({
  variant,
  size,
  loading = false,
  asChild = false,
  className,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const classes = buttonClasses({ variant, size, className });
  if (asChild) {
    return (
      <Slot.Root className={classes} {...props}>
        {children}
      </Slot.Root>
    );
  }
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          {/* Transparent, not hidden: the label stays the accessible name. */}
          <span className="inline-flex items-center gap-[inherit] opacity-0">{children}</span>
          <span className="absolute inset-0 inline-flex items-center justify-center">
            <Spinner />
          </span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
