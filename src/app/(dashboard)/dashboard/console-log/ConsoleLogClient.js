"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { CONSOLE_LOG_CONFIG } from "@/shared/constants/config";
import { translate } from "@/i18n/runtime";
import { cn } from "@/shared/utils/cn";

// Strip leftover emoji from text so old/pre-change buffered lines stay readable
// too (the server now cleans new lines at capture; this covers legacy strings).
const EMOJI_MAP = {
  "\u2705": "\u2713", // ✅ → ✓
  "\u274C": "\u2716", // ❌ → ✖
  "\u2717": "\u2716", // ✗ → ✖
  "\u2716": "\u2716", // ✖ → ✖
  "\u26A0\uFE0F": "!",
  "\u26A0": "!",
  "\u{1F4E5}": "\u2193",
  "\u{1F4E4}": "\u2191",
};

function stripEmoji(str) {
  return str.replace(/\p{Extended_Pictographic}(?:\uFE0F)?/gu, (m) => EMOJI_MAP[m] || "");
}

// Normalize a log line into { level, text }. Older buffered lines may be plain
// strings (before level metadata existed), so fall back to a best-effort level.
function normalizeLine(line) {
  if (typeof line === "string") {
    const level = /\b(FATAL|ERROR)\b|❌|✖|✗/.test(line) ? "error" : "log";
    return { level, text: stripEmoji(line) };
  }
  return {
    level: line.level || "log",
    text: stripEmoji(line.text || ""),
  };
}

// Break a line into timestamp + tag + rest for clean display.
function parseLine(text) {
  const tsMatch = text.match(/^\[([0-9:.]+)\]\s*/);
  const ts = tsMatch ? tsMatch[1] : null;
  const afterTs = tsMatch ? text.slice(tsMatch[0].length) : text;

  const tagMatch = afterTs.match(/^\[([\w+-]+)\]\s*/);
  const tag = tagMatch ? tagMatch[1] : null;
  const rest = tagMatch ? afterTs.slice(tagMatch[0].length) : afterTs;

  return { ts, tag, rest };
}

// Level styling is restrained: the message text always stays neutral/warm, and
// color only appears on a small pill chip. Routine log/debug lines get no chip
// at all so the stream reads calm.
const LEVEL_STYLE = {
  log: { label: null, labelCls: "", textCls: "text-text-muted" },
  debug: { label: null, labelCls: "", textCls: "text-text-subtle" },
  info: { label: "info", labelCls: "bg-info/10 text-info", textCls: "text-text-main" },
  warn: { label: "warn", labelCls: "bg-warning/10 text-warning", textCls: "text-text-main" },
  error: { label: "error", labelCls: "bg-danger/10 text-danger", textCls: "text-text-main" },
};

const FILTER_PRESETS = [
  { id: "all", label: "All", levels: ["log", "info", "warn", "error", "debug"] },
  { id: "warn-error", label: "Warn + Error", levels: ["warn", "error"] },
  { id: "error", label: "Errors only", levels: ["error"] },
];

function renderLine(entry) {
  const { ts, tag, rest } = parseLine(entry.text);
  const style = LEVEL_STYLE[entry.level] || LEVEL_STYLE.log;

  const isContinuation = /^\s+at\s|^\s+\.\.\.|^Caused by:/.test(rest);

  return (
    <div
      className={cn(
        "flex items-start gap-2 whitespace-pre-wrap break-words",
        isContinuation && "text-text-subtle"
      )}
    >
      {style.label ? (
        <span
          className={cn(
            "shrink-0 rounded px-1.5 py-px text-[10px] font-medium leading-4",
            style.labelCls
          )}
        >
          {style.label}
        </span>
      ) : (
        <span className="shrink-0 w-[6px]" />
      )}
      {ts && <span className="shrink-0 text-text-subtle">{ts}</span>}
      {tag && <span className="shrink-0 text-text-subtle">[{tag}]</span>}
      <span className={cn(style.textCls)}>
        {rest}
      </span>
      {entry.count > 1 && (
        <span className="shrink-0 rounded bg-surface-2 px-1.5 text-[10px] text-text-subtle">
          ×{entry.count}
        </span>
      )}
    </div>
  );
}

export default function ConsoleLogClient() {
  const [logs, setLogs] = useState([]);
  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterId, setFilterId] = useState("warn-error");
  const [query, setQuery] = useState("");
  const logRef = useRef(null);
  const pausedRef = useRef(false);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const handleClear = async () => {
    try {
      await fetch("/api/translator/console-logs", { method: "DELETE" });
      // UI cleared via SSE "clear" event
    } catch (err) {
      console.error("Failed to clear console logs:", err);
    }
  };

  useEffect(() => {
    const es = new EventSource("/api/translator/console-logs/stream");

    es.onopen = () => setConnected(true);

    // Merge incoming lines into the log list. Duplicate text directly after an
    // identical line is collapsed into a counter to keep repeated spam readable.
    const mergeLines = (incoming) => {
      setLogs((prev) => {
        let next = [...prev];
        for (const raw of incoming) {
          const entry = normalizeLine(raw);
          const last = next[next.length - 1];
          if (last && last.text === entry.text && last.level === entry.level) {
            next = [...next.slice(0, -1), { ...last, count: (last.count || 1) + 1 }];
          } else {
            next = [...next, { ...entry, count: 1 }];
          }
        }
        return next.length > CONSOLE_LOG_CONFIG.maxLines
          ? next.slice(-CONSOLE_LOG_CONFIG.maxLines)
          : next;
      });
    };

    es.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "init") {
        setLogs(msg.logs.slice(-CONSOLE_LOG_CONFIG.maxLines).map(normalizeLine));
      } else if (msg.type === "line") {
        if (!pausedRef.current) mergeLines([msg.line]);
      } else if (msg.type === "lines") {
        if (!pausedRef.current) mergeLines(msg.lines);
      } else if (msg.type === "clear") {
        setLogs([]);
      }
    };

    es.onerror = () => setConnected(false);

    return () => es.close();
  }, []);

  const visibleLogs = useMemo(() => {
    const preset = FILTER_PRESETS.find((p) => p.id === filterId) || FILTER_PRESETS[0];
    const levels = new Set(preset.levels);
    const q = query.trim().toLowerCase();
    return logs.filter((entry) => {
      if (!levels.has(entry.level)) return false;
      if (!q) return true;
      return entry.text.toLowerCase().includes(q);
    });
  }, [logs, filterId, query]);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (!autoScroll || !logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [visibleLogs, autoScroll]);

  return (
    <div className="flex min-w-0 flex-col gap-4 px-1 sm:px-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-text-main">Console Log</h1>
          <p className="mt-1 text-xs text-text-subtle">
            {connected ? "Live server output" : "Disconnected — reconnecting…"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-full bg-surface-2 p-1">
            {FILTER_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setFilterId(p.id)}
                className={cn(
                  "rounded-full px-3 py-1 font-display text-xs font-medium transition-colors",
                  filterId === p.id ? "bg-surface text-text-main" : "text-text-muted hover:text-text-main"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={translate("Filter lines…")}
            className="h-8 w-40 rounded-lg border border-border bg-surface px-2.5 text-xs text-text-main placeholder:text-text-subtle focus:border-text-subtle"
          />
          <button
            type="button"
            onClick={() => setPaused((v) => !v)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-display font-medium transition-colors",
              paused ? "bg-surface-2 text-text-main" : "text-text-muted hover:bg-surface-2 hover:text-text-main"
            )}
            title={translate(paused ? "Resume live streaming" : "Pause live streaming")}
          >
            <span className="material-symbols-outlined text-[16px]">{paused ? "play_arrow" : "pause"}</span>
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            onClick={() => setAutoScroll((v) => !v)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-display font-medium transition-colors",
              autoScroll ? "text-text-main" : "text-text-muted hover:bg-surface-2 hover:text-text-main"
            )}
            title={translate("Auto-scroll to newest logs")}
          >
            <span className="material-symbols-outlined text-[16px]">vertical_align_bottom</span>
            Auto
          </button>
          <span className="h-5 w-px bg-border" aria-hidden="true" />
          <button
            onClick={handleClear}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-display font-medium text-danger/80 transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            Clear
          </button>
        </div>
      </div>

      <div
        ref={logRef}
        className="h-[calc(100vh-220px)] overflow-y-auto rounded-xl border border-border bg-bg p-3 font-mono text-xs leading-relaxed"
      >
        {visibleLogs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <span className="material-symbols-outlined text-2xl text-text-subtle">terminal</span>
            <span className="text-xs text-text-subtle">
              {logs.length === 0 ? "No console logs yet." : "No matching lines."}
            </span>
          </div>
        ) : (
          <div className="space-y-px">
            {visibleLogs.map((entry, i) => (
              <div key={i} className="rounded-md px-1.5 transition-colors hover:bg-surface-2/40">
                {renderLine(entry)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
