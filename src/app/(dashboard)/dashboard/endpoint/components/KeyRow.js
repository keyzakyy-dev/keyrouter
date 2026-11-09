"use client";

import { Toggle } from "@/shared/components";

function maskKey(fullKey) {
  if (!fullKey || fullKey.length <= 10) return fullKey || "";
  return fullKey.slice(0, 6) + "•".repeat(fullKey.length - 10) + fullKey.slice(-4);
}

/**
 * One API-key card, shared by the custom-key list and the Default key card.
 * State (visible/copied) lives with the parent; this stays presentational.
 */
export default function KeyRow({
  apiKey,
  icon,
  visible,
  copied,
  onToggleVisibility,
  onCopy,
  onToggle,
  onDelete,
  children,
}) {
  const key = apiKey;
  return (
    <div
      className={`group rounded-xl border border-border-subtle bg-surface px-3.5 py-3 transition ${
        key.isActive === false ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon && (
            <span className="material-symbols-outlined text-[20px] text-text-subtle">{icon}</span>
          )}
          <p className="min-w-0 truncate font-display text-[15px] font-semibold text-text-main">{key.name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Toggle
            size="sm"
            checked={key.isActive ?? true}
            onChange={onToggle}
            title={key.isActive ? "Pause key" : "Resume key"}
          />
          <button
            onClick={onDelete}
            className="grid size-8 place-items-center rounded-lg text-text-muted transition hover:bg-danger/10 hover:text-danger"
            title="Delete key"
          >
            <span className="material-symbols-outlined text-[17px]">delete</span>
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <code className="min-w-0 flex-1 truncate rounded-lg border border-border-subtle bg-bg px-3 py-2 font-mono text-[13px] text-text-muted">
          {visible ? key.key : maskKey(key.key)}
        </code>
        <button
          onClick={onToggleVisibility}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-text-muted transition hover:bg-surface-2 hover:text-text-main"
          title={visible ? "Hide key" : "Show key"}
        >
          <span className="material-symbols-outlined text-[16px]">
            {visible ? "visibility_off" : "visibility"}
          </span>
        </button>
        <button
          onClick={onCopy}
          className={`grid size-9 shrink-0 place-items-center rounded-lg transition ${
            copied
              ? "bg-success/10 text-success"
              : "text-text-muted hover:bg-surface-2 hover:text-text-main"
          }`}
          title="Copy key"
        >
          <span className="material-symbols-outlined text-[16px]">{copied ? "check" : "content_copy"}</span>
        </button>
      </div>

      {key.isActive === false && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-warning">
          <span className="material-symbols-outlined text-[13px]">pause_circle</span>
          Paused - clients using this key get rejected.
        </p>
      )}

      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
