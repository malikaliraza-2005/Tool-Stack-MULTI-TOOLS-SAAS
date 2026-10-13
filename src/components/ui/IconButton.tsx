"use client";

import type { ComponentProps, ReactNode } from "react";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./Button";
import { Spinner } from "./Spinner";
import { Tooltip } from "./Tooltip";

type IconButtonProps = Omit<ComponentProps<"button">, "aria-label" | "children"> & {
  /** Accessible name, also shown as the tooltip (design-system §6). */
  label: string;
  icon: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  tooltipSide?: ComponentProps<typeof Tooltip>["side"];
  /**
   * Show the label as a tooltip (default). Turn off only where the icon is
   * universal and a tooltip would get in the way, e.g. a dialog's close button,
   * whose tooltip would otherwise swallow the first Esc.
   */
  tooltip?: boolean;
};

export function IconButton({
  label,
  icon,
  variant = "ghost",
  size = "md",
  loading = false,
  disabled,
  className,
  tooltipSide,
  tooltip = true,
  type = "button",
  ...props
}: IconButtonProps) {
  const button = (
    <button
      type={type}
      aria-label={label}
      aria-busy={loading || undefined}
      // A disabled button cannot receive focus or hover, so it gets no tooltip.
      disabled={disabled || loading}
      className={buttonClasses({ variant, size, iconOnly: true, className })}
      {...props}
    >
      {loading ? <Spinner /> : icon}
    </button>
  );
  if (disabled || loading || !tooltip) return button;
  return (
    <Tooltip content={label} side={tooltipSide}>
      {button}
    </Tooltip>
  );
}
