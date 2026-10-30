"use client";

import PropTypes from "prop-types";
import { cn } from "@/shared/utils/cn";

/**
 * Monospace read-only URL with a copy affordance.
 * size="lg" is used for the primary local endpoint, "sm" for remote routes.
 */
export default function UrlField({ value, copyId, copied, onCopy, size = "sm", onOpen, className }) {
  const large = size === "lg";
  const isCopied = copied === copyId;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border bg-surface pl-3 pr-1",
        "border-border focus-within:border-text-subtle focus-within:ring-1 focus-within:ring-text-subtle/50 transition",
        large ? "h-11" : "h-9",
        className
      )}
    >
      <span
        className={cn(
          "material-symbols-outlined shrink-0 text-text-subtle",
          large ? "text-[18px]" : "text-[15px]"
        )}
      >
        link
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate font-mono text-text-main",
          large ? "text-[13px] sm:text-sm" : "text-[12px]"
        )}
        title={value}
      >
        {value}
      </span>
      {onOpen && (
        <button
          type="button"
          onClick={onOpen}
          className="grid size-7 shrink-0 place-items-center rounded-[4px] text-text-muted transition hover:bg-surface-2 hover:text-text-main"
          title="Open endpoint"
          aria-label="Open endpoint"
        >
          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
        </button>
      )}
      <button
        type="button"
        onClick={() => onCopy(value, copyId)}
        className={cn(
          "grid shrink-0 place-items-center rounded-[4px] transition",
          large ? "size-8" : "size-7",
          isCopied
            ? "bg-success/12 text-success"
            : "text-text-muted hover:bg-surface-2 hover:text-text-main"
        )}
        title="Copy"
        aria-label="Copy to clipboard"
      >
        <span className={cn("material-symbols-outlined", large ? "text-[18px]" : "text-[16px]")}>
          {isCopied ? "check" : "content_copy"}
        </span>
      </button>
    </div>
  );
}

UrlField.propTypes = {
  value: PropTypes.string.isRequired,
  copyId: PropTypes.string.isRequired,
  copied: PropTypes.string,
  onCopy: PropTypes.func.isRequired,
  size: PropTypes.oneOf(["sm", "lg"]),
  onOpen: PropTypes.func,
  className: PropTypes.string,
};
