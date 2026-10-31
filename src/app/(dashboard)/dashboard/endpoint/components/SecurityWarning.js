"use client";

/** Security warning banner with optional action link */
export default function SecurityWarning({ message, action, title = "Security notice" }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
        <span className="material-symbols-outlined text-[19px]">warning</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[13px] font-semibold text-amber-700 dark:text-amber-300">{title}</p>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider leading-relaxed text-amber-700/80 dark:text-amber-400/80">{message}</p>
      </div>
      {action && (
        <a
          href={action.href}
          className="shrink-0 rounded-lg bg-amber-500/15 px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wider text-amber-700 transition-colors hover:bg-amber-500/25 dark:text-amber-300"
          onClick={action.href.startsWith("#") ? (e) => {
            e.preventDefault();
            document.getElementById(action.href.slice(1))?.scrollIntoView({ behavior: "smooth" });
          } : undefined}
        >
          {action.label}
        </a>
      )}
    </div>
  );
}
