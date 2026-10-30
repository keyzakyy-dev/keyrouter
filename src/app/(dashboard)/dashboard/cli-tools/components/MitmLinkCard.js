"use client";

import Link from "next/link";
import { Card } from "@/shared/components";
import Image from "next/image";

/**
 * Clickable card for MITM tools — navigates to /dashboard/mitm on click.
 */
export default function MitmLinkCard({ tool }) {
  return (
    <Link href="/dashboard/mitm" className="group block">
      <Card padding="sm" className="overflow-hidden transition-colors hover:bg-surface-2 cursor-pointer">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-surface-2">
              <Image
                src={tool.image}
                alt={tool.name}
                width={24}
                height={24}
                className="size-6 object-contain"
                sizes="24px"
                onError={(e) => { e.target.style.display = "none"; }}
              loading="lazy"
              decoding="async"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-display text-[13px] font-medium text-text-main">{tool.name}</h3>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-text-muted">MITM</span>
              </div>
              <p className="truncate text-xs text-text-muted">{tool.description}</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-text-subtle text-[20px] opacity-40 transition-opacity group-hover:opacity-100">chevron_right</span>
        </div>
      </Card>
    </Link>
  );
}
