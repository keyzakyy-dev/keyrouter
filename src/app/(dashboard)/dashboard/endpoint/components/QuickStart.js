"use client";

import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";

const TABS = [
  { id: "curl", label: "cURL" },
  { id: "js", label: "JavaScript" },
  { id: "python", label: "Python" },
];

function buildSnippet(tab, baseUrl, apiKey) {
  const url = `${baseUrl}/chat/completions`;
  const key = apiKey || "$KEYROUTER_API_KEY";
  const body = `"model": "gpt-4o-mini",
    "messages": [{ "role": "user", "content": "Summarize today's changelog" }]`;

  if (tab === "js") {
    return `const res = await fetch("${url}", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.KEYROUTER_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    ${body}
  }),
});

const { choices } = await res.json();
console.log(choices[0].message.content);`;
  }

  if (tab === "python") {
    return `from openai import OpenAI

client = OpenAI(base_url="${baseUrl}", api_key="${apiKey || "YOUR_KEY"}")

print(client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Summarize today's changelog"}],
).choices[0].message.content)`;
  }

  return `curl ${url} \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    ${body}
  }'`;
}

/** Instrument-style dark readout for the request snippet. */
export default function QuickStart({ baseUrl, apiKey }) {
  const [tab, setTab] = useState("curl");
  const { copied, copy } = useCopyToClipboard();
  const key = apiKey || "";

  const snippet = useMemo(() => buildSnippet(tab, baseUrl, key), [tab, baseUrl, key]);
  const copyId = `snippet_${tab}`;

  return (
    <div className="overflow-hidden rounded-md border border-[#c9c4b4] bg-[#161412] text-slate-300 shadow-[var(--shadow-elev)]">
      {/* Readout label strip */}
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <span className="material-symbols-outlined text-[14px] text-slate-500">terminal</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">
          Request · sample
        </span>
        <div className="ml-auto flex items-center gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-[4px] px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition ${
                tab === t.id
                  ? "bg-white/10 text-white"
                  : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
              }`}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => copy(snippet, copyId)}
            className={`ml-1 flex items-center gap-1 rounded-[4px] px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition ${
              copied === copyId
                ? "text-emerald-300"
                : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
            }`}
          >
            <span className="material-symbols-outlined text-[13px]">
              {copied === copyId ? "check" : "content_copy"}
            </span>
            {copied === copyId ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <pre className="max-h-[240px] overflow-auto p-3.5 font-mono text-[11.5px] leading-relaxed text-slate-300">
        <code>{snippet}</code>
      </pre>
      <div className="flex items-center gap-2 border-t border-white/10 px-3.5 py-2 text-[11px] text-slate-500">
        <span className="material-symbols-outlined text-[13px]">lock</span>
        <span className="font-mono text-[10px] uppercase tracking-wider">
          {apiKey ? "Uses your first key" : "Replace placeholder with one of your keys"}
        </span>
      </div>
    </div>
  );
}

QuickStart.propTypes = {
  baseUrl: PropTypes.string.isRequired,
  apiKey: PropTypes.string,
};
