"use client";

import { Card } from "@/shared/components";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import {
  SKILLS,
  SKILLS_REPO_URL,
  getSkillRawUrl,
} from "@/shared/constants/skills";

function CopyButton({ value, label = "Copy" }) {
  const { copied, copy } = useCopyToClipboard(2000);
  return (
    <button
      onClick={() => copy(value)}
      className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-2.5 font-display text-[11px] font-semibold transition-colors cursor-pointer ${
        copied
          ? "border-success bg-success/10 text-success"
          : "border-text-subtle text-text-main hover:bg-surface-2"
      }`}
      title={value}
    >
      <span className="material-symbols-outlined text-[12px]">
        {copied ? "check" : "content_copy"}
      </span>
      {copied ? "Copied!" : label}
    </button>
  );
}

function SkillRow({ skill }) {
  const url = getSkillRawUrl(skill.id);
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
        skill.isEntry
          ? "border-border bg-surface-2/50"
          : "border-border-subtle bg-surface hover:bg-surface-2/60"
      }`}
    >
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2 border border-border">
        <span className="material-symbols-outlined text-[18px] text-text-muted">{skill.icon}</span>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display text-sm font-medium text-text-main">{skill.name}</h3>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          {skill.isEntry && (
            <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-text-muted">START HERE</span>
          )}
          {skill.endpoint && (
            <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-text-muted">
              <code className="text-[10px]">{skill.endpoint}</code>
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-text-muted line-clamp-2">{skill.description}</p>
      </div>

      <CopyButton value={url} />
    </div>
  );
}

export default function SkillsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-text-main">Skills</h1>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-text-subtle">
          Copy-paste agent skills for KeyRouter
        </p>
      </div>

      <Card padding="md">
        <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-text-subtle">Paste into your AI</div>
        <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-[12px] text-text-main">
          Read this skill and use it: {getSkillRawUrl("keyrouter")}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {SKILLS.map((skill) => (
          <SkillRow key={skill.id} skill={skill} />
        ))}
      </div>

      <Card padding="md">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor" className="shrink-0 text-text-muted" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            <div>
              <h2 className="font-display text-base font-semibold text-text-main">More on GitHub</h2>
              <p className="mt-0.5 text-xs text-text-muted">
                Browse the source, README, and examples for every skill.
              </p>
            </div>
          </div>
          <a
            href={`${SKILLS_REPO_URL}/tree/master/skills`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-sm font-display font-medium text-text-main transition-colors hover:border-text-subtle hover:bg-surface-3"
          >
            <span className="material-symbols-outlined text-[16px] text-text-muted">open_in_new</span>
            View on GitHub
          </a>
        </div>
      </Card>
    </div>
  );
}
