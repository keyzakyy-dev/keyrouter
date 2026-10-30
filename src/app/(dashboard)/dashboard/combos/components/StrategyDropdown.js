"use client";

import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

const OPTION_META = {
  fallback: { icon: "swap_horiz" },
  "round-robin": { icon: "autorenew" },
  smart: { icon: "psychology" },
  fusion: { icon: "all_inclusive" },
};

/** Custom strategy dropdown (replaces native <select> so options can be styled). */
export default function StrategyDropdown({ options, value, onChange, className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value) || options[0];

  return (
    <div className={className} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 font-display text-sm text-text-main outline-none transition-colors hover:border-text-subtle focus-visible:ring-2 focus-visible:ring-text-subtle/60"
      >
        <span className="material-symbols-outlined text-[16px] text-text-muted">
          {OPTION_META[value]?.icon || "label"}
        </span>
        <span className="flex-1 truncate text-left">{selected?.label}</span>
        <span className={`material-symbols-outlined text-[16px] text-text-muted transition-transform duration-150 ${open ? "rotate-180" : ""}`}>
          expand_more
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-[var(--shadow-elevated)]"
        >
          {options.map((option) => {
            const active = option.value === value;
            const meta = OPTION_META[option.value] || { icon: "label" };
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  active ? "bg-surface-2 text-text-main" : "text-text-muted hover:bg-surface-2 hover:text-text-main"
                }`}
              >
                <span className={`material-symbols-outlined text-[18px] ${active ? "text-text-main" : "text-text-subtle"}`}>
                  {meta.icon}
                </span>
                <span className="flex-1 font-display">{option.label}</span>
                {active && (
                  <span className="material-symbols-outlined text-[18px] text-text-main">check</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

StrategyDropdown.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({ value: PropTypes.string.isRequired, label: PropTypes.string.isRequired })
  ).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  className: PropTypes.string,
};
