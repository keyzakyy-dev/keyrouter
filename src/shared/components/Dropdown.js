"use client";

import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { cn } from "@/shared/utils/cn";

/**
 * Custom listbox dropdown (replaces native <select> so options can be styled).
 * Mirrors the StrategyDropdown visual pattern but is generic:
 * - options: [{ value, label, disabled?, hint?, icon? }]
 * - value: current selected value (loosely compared, supports numbers)
 * - onChange(value): called with the option's value
 * - placeholder: shown when nothing selected
 * - disabled: disables the trigger
 * - align: "left" | "right"
 */
export default function Dropdown({
  options = [],
  value,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  className,
  buttonClassName,
  menuClassName,
  align = "left",
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const selected = options.find((o) => String(o.value) === String(value));
  const selectedLabel = selected?.label;
  const selectedIcon = selected?.icon;

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-left font-display text-sm text-text-main outline-none transition-colors",
          "hover:border-text-subtle focus-visible:ring-2 focus-visible:ring-text-subtle/60",
          "disabled:cursor-not-allowed disabled:opacity-50",
          buttonClassName
        )}
      >
        {selectedIcon && (
          <span className="material-symbols-outlined text-[16px] text-text-muted">
            {selectedIcon}
          </span>
        )}
        <span className={cn("flex-1 truncate", !selectedLabel && "text-text-subtle")}>
          {selectedLabel || placeholder}
        </span>
        <span
          className={cn(
            "material-symbols-outlined text-[16px] text-text-muted transition-transform duration-150",
            open && "rotate-180"
          )}
        >
          expand_more
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          className={cn(
            "absolute z-30 mt-2 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-[var(--shadow-elevated)]",
            align === "right" ? "right-0" : "left-0",
            menuClassName
          )}
        >
          {options.map((option) => {
            const active = String(option.value) === String(value);
            const itemDisabled = disabled || option.disabled;
            return (
              <button
                key={String(option.value)}
                type="button"
                role="option"
                aria-selected={active}
                disabled={itemDisabled}
                onClick={() => {
                  if (itemDisabled) return;
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  itemDisabled
                    ? "cursor-not-allowed opacity-40"
                    : active
                      ? "bg-surface-2 text-text-main"
                      : "text-text-muted hover:text-primary dark:hover:text-primary"
                )}
              >
                {option.icon && (
                  <span className={cn("material-symbols-outlined text-[18px]", active ? "text-text-main" : "text-text-subtle group-hover:text-primary dark:group-hover:text-primary")}>
                    {option.icon}
                  </span>
                )}
                <span className="flex-1 font-display">{option.label}</span>
                {option.hint && (
                  <span className="text-[10px] uppercase tracking-wider text-text-subtle">{option.hint}</span>
                )}
                {active && (
                  <span className="material-symbols-outlined text-[18px] text-primary dark:text-primary">check</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

Dropdown.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
      disabled: PropTypes.bool,
      hint: PropTypes.string,
      icon: PropTypes.string,
    })
  ),
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  buttonClassName: PropTypes.string,
  menuClassName: PropTypes.string,
  align: PropTypes.oneOf(["left", "right"]),
};
