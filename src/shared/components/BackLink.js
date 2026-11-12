import Link from "next/link";

/**
 * Back navigation link shared by all detail pages.
 * Quiet by default; on hover the background appears and the arrow slides left.
 */
export default function BackLink({ href, children, className = "" }) {
  return (
    <Link
      href={href}
      className={`group inline-flex h-8 items-center gap-1.5 rounded-full pl-2 pr-3 -ml-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-2 hover:text-text-main w-fit ${className}`}
    >
      <span className="material-symbols-outlined text-[18px] transition-transform duration-150 group-hover:-translate-x-0.5">arrow_back</span>
      {children}
    </Link>
  );
}
