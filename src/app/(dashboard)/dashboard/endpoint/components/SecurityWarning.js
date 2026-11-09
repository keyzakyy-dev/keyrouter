"use client";

/** Security warning banner with optional action link */
export default function SecurityWarning({ message, action, title = "Security notice" }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-clay-500/25 bg-clay-500/[0.07] p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-clay-500/15 text-clay-600 dark:text-clay-400">
        <span className="material-symbols-outlined text-[19px]">warning</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[13px] font-semibold text-clay-700 dark:text-clay-300">{title}</p>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider leading-relaxed text-clay-700/80 dark:text-clay-400/80">{message}</p>
      </div>
      {action && (
        <a
          href={action.href}
          className="shrink-0 rounded-lg bg-clay-500/15 px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wider text-clay-700 transition-colors hover:bg-clay-500/25 dark:text-clay-300"
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
