"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-label"?: string;
}

/**
 * Neo‑brutalism style Switch
 * - Thick borders, strong shadow, simple transitions
 * - Accessible via role="switch" and aria-checked
 */
export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      checked: controlledChecked,
      defaultChecked,
      onCheckedChange,
      disabled,
      id,
      className,
      "aria-label": ariaLabel,
    },
    ref
  ) => {
    const [uncontrolled, setUncontrolled] = React.useState(!!defaultChecked);
    const isControlled = controlledChecked !== undefined;
    const checked = isControlled ? !!controlledChecked : uncontrolled;

    const toggle = React.useCallback(() => {
      if (disabled) return;
      if (isControlled) {
        onCheckedChange?.(!checked);
      } else {
        setUncontrolled((v) => {
          const nv = !v;
          onCheckedChange?.(nv);
          return nv;
        });
      }
    }, [checked, disabled, isControlled, onCheckedChange]);

    return (
      <button
        ref={ref}
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        onClick={toggle}
        disabled={disabled}
        className={cn(
          "relative inline-flex h-6 w-10 items-center rounded-full border-2 border-black",
          "transition-colors select-none align-middle",
          "shadow-[4px_4px_0_0_#000]",
          checked ? "bg-blue-400" : "bg-white",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          className
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none block h-4 w-4 rounded-full border-2 border-black bg-white",
            "shadow-[2px_2px_0_0_#000] transition-transform",
            checked ? "translate-x-5" : "translate-x-1"
          )}
        />
      </button>
    );
  }
);
Switch.displayName = "Switch";
