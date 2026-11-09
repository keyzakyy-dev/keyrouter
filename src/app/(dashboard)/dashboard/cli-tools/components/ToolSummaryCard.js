"use client";

import Link from "next/link";
import Image from "next/image";
import { Card } from "@/shared/components";

// Derive simple connected/configured/not-installed status from API payload
function getStatus(status, tool) {
  if (tool?.configType === "guide") return { label: "Guide", cls: "bg-surface-2 text-text-muted" };
  if (!status) return { label: "Unknown", cls: "bg-surface-2 text-text-muted" };
  if (!status.installed) return { label: "Not installed", cls: "bg-surface-2 text-text-muted" };
  if (status.hasKeyRouter) return { label: "Connected", cls: "bg-success/10 text-success" };
  return { label: "Not configured", cls: "bg-warning/10 text-warning" };
}

export default function ToolSummaryCard({ toolId, tool, status }) {
  const s = getStatus(status, tool);
  return (
    <Link href={`/dashboard/cli-tools/${toolId}`} className="group block">
      <Card padding="sm" className="h-full overflow-hidden transition-colors hover:bg-surface-2 cursor-pointer">
        <div className="flex h-full flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-surface-2">
              {tool.image ? (
                <Image src={tool.image} alt={tool.name} width={24} height={24} className="size-6 object-contain" sizes="24px" onError={(e) => { e.target.style.display = "none"; }} loading="lazy" decoding="async" />
              ) : tool.icon ? (
                <span className="material-symbols-outlined text-[22px]" style={{ color: tool.color }}>{tool.icon}</span>
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-display text-[13px] font-medium text-text-main">{tool.name}</h3>
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] ${s.cls}`}>{s.label}</span>
            </div>
            <span className="material-symbols-outlined text-text-subtle text-[18px] opacity-40 transition-opacity group-hover:opacity-100 shrink-0">chevron_right</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
