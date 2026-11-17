// Shared OpenAI-style tool calling for web-cookie providers.
//
// WHY THIS EXISTS
// A web-cookie provider is a RAG-style chat endpoint behind a browser session:
// it accepts a plain text prompt and answers with text only. It has no
// protocol-level function calling, so an agent that sends `tools` either gets a
// prose answer it cannot execute or a hard 400. This module bridges that gap
// at the application level: the OpenAI `tools` array is encoded into the prompt
// and the model's reply is parsed back into standard `tool_calls`, so the client
// sees ordinary OpenAI output and its own handlers run unchanged.
//
// The prompt shape follows zexadev/gemini-web2api-go (internal/app/messages.go):
//   1. a leading "[System instruction]: You have access to tools" block that
//      carries the schema and the tool_choice rule (none / auto / required /
//      a forced function name), then
//   2. the normal transcript, then
//   3. a trailing "highest priority" reminder that re-anchors the fence
//      format. Without the tail anchor a 40KB agent system prompt with its own
//      "emit function calls" wording drowns the leading rule and the model
//      answers "I have no tools" or writes a ```powershell block for the user.
//      The behavioural few-shot at the end is what makes the fence actually
//      come out (measured 3-4/4 with the example, 0/4 without).
//
// Two fence styles are supported because providers differ in what they obey:
//   - "marker" : <<TOOL_CALL>> {"name":"x","arguments":{...}} <<TOOL_CALL>>
//   - "fenced" : ```tool_call\n{"name":"x","arguments":{...}}\n```
// `pickFenceStyle` chooses per provider; parsers accept both either way so a
// model that mixes styles still gets its call recovered.

import { estimateInputTokens, estimateOutputTokens } from "../utils/usageTracking.js";

const MARKER = "<<TOOL_CALL>>";
const RESULT_MARKER = "<<TOOL_RESULT>>";
const FENCE_OPEN = "```tool_call";
const FENCE_CLOSE = "```";

// ---------------------------------------------------------------- tool schema

export function hasTools(body) {
  const tools = Array.isArray(body?.tools) ? body.tools : null;
  if (tools && tools.length > 0) return true;
  const fns = Array.isArray(body?.functions) ? body.functions : null;
  return Boolean(fns && fns.length > 0);
}

function fnOf(tool) {
  if (tool && typeof tool === "object" && tool.function && typeof tool.function === "object") {
    return tool.function;
  }
  return tool && typeof tool === "object" ? tool : {};
}

/** Tool definitions the model is allowed to name, honouring a forced function. */
export function selectableTools(body) {
  const raw = Array.isArray(body?.tools) && body.tools.length
    ? body.tools
    : (Array.isArray(body?.functions) && body.functions.length ? body.functions : []);
  const { mode, forced } = parseToolChoice(body?.tool_choice ?? body?.toolChoice);
  const out = [];
  for (const tool of raw) {
    const fn = fnOf(tool);
    const name = typeof fn.name === "string" ? fn.name.trim() : "";
    if (!name) continue;
    if (forced && name !== forced) continue;
    out.push({
      name,
      description: typeof fn.description === "string" ? fn.description : "",
      parameters:
        fn.parameters && typeof fn.parameters === "object"
          ? fn.parameters
          : { type: "object", properties: {} },
    });
  }
  return { defs: out, mode, forced };
}

/**
 * OpenAI tool_choice -> { mode, forced }.
 * mode is "none" | "auto" | "required"; forced is a function name or "".
 */
export function parseToolChoice(raw) {
  if (raw == null) return { mode: "auto", forced: "" };
  if (typeof raw === "string") {
    const v = raw.trim().toLowerCase();
    if (v === "none") return { mode: "none", forced: "" };
    if (v === "required" || v === "any") return { mode: "required", forced: "" };
    return { mode: "auto", forced: "" };
  }
  if (typeof raw === "object") {
    const name = raw?.function?.name ?? raw?.name;
    if (typeof name === "string" && name.trim()) {
      return { mode: "required", forced: name.trim() };
    }
  }
  return { mode: "auto", forced: "" };
}

export function pickFenceStyle(explicit) {
  if (explicit === "marker" || explicit === "fenced") return explicit;
  return "marker";
}

// ------------------------------------------------------------------- prompting

function instructionLine(mode, forced) {
  if (forced) {
    return `Call the tool "${forced}" now: reply with the tool_call block and nothing else, even if you know the answer.`;
  }
  if (mode === "required") {
    return "Call one of the tools now: reply with the tool_call block and nothing else, even if you know the answer.";
  }
  return "Call a tool only when the request needs one.";
}

function exampleBlock(style, defs = [], forced = "") {
  const pick = defs.find((def) => def.name === forced) || defs[0];
  const name = pick?.name || "func_name";
  const keys = Object.keys(pick?.parameters?.properties || {});
  const key = COMMAND_ARG_KEYS.find((candidate) => keys.includes(candidate)) || keys[0] || "argument";
  const value = COMMAND_ARG_KEYS.includes(key) ? "ls -la" : "<value>";
  const json = `{"name": ${JSON.stringify(name)}, "arguments": {${JSON.stringify(key)}: ${JSON.stringify(value)}}}`;
  if (style === "fenced") return `${FENCE_OPEN}\n${json}\n${FENCE_CLOSE}`;
  return `${MARKER} ${json} ${MARKER}`;
}

/**
 * The leading system instruction carrying the schema and the choice rule.
 * Returns "" when the request asks for no tools at all.
 *
 * Kept deliberately short: DeepAI's small free models drop the whole tool
 * protocol when the instruction grows into paragraphs (measured 0/4 calls with
 * the long form, 4/4 with this one), so every rule here has to earn its line.
 */
export function buildToolInstructions(body, style = "marker") {
  const { defs, mode, forced } = selectableTools(body);
  if (!defs.length || mode === "none") return "";
  const opener = style === "fenced"
    ? `[Tool protocol] You have tools. To call one, reply with exactly:\n${FENCE_OPEN}\n{"name": "<tool>", "arguments": {...}}\n${FENCE_CLOSE}`
    : `[Tool protocol] You have tools. To call one, reply with exactly:\n${MARKER} {"name": "<tool>", "arguments": {...}} ${MARKER}`;
  return [
    opener,
    "The block is JSON: a real tool name from the list and its exact argument names. Never write a bare command such as tool_call: ls -la, and never just describe the call.",
    instructionLine(mode, forced),
    "",
    "Available tools:",
    JSON.stringify(defs, null, 2),
  ].join("\n");
}

/**
 * The trailing highest-priority reminder. Re-anchors the format after a long
 * agent system prompt without turning into a wall of rules: a long reminder
 * makes the free models answer conversationally instead of calling (measured).
 */
export function buildToolReminder(style = "marker", options = {}) {
  const { forced = "", mode = "auto", defs = [] } = options || {};
  const forcedLine = forced
    ? `This turn is FORCED: call "${forced}" and nothing else.`
    : mode === "required"
      ? "This turn is FORCED: call a tool and nothing else."
      : "";
  const lines = [
    "[Tool protocol - highest priority] Reply with ONE tool_call block and nothing else:",
    exampleBlock(style, defs, forced),
    "A code block is not executed and prose cannot act; never claim you lack tools. Use the real tool names and argument names above. After a tool result, stop and answer briefly.",
  ];
  if (forcedLine) lines.push(forcedLine);
  return lines.join("\n");
}

// ------------------------------------------------------------------ transcript

function textOf(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((c) => c && (c.type === "text" || typeof c.text === "string"))
      .map((c) => String(c.text ?? ""))
      .join("\n");
  }
  if (content && typeof content === "object" && typeof content.text === "string") return content.text;
  return "";
}

export { textOf as extractText };

function callLine(name, argsJson, style) {
  const payload = `{"name": ${JSON.stringify(name)}, "arguments": ${argsJson}}`;
  if (style === "fenced") return `${FENCE_OPEN}\n${payload}\n${FENCE_CLOSE}`;
  return `${MARKER} ${payload} ${MARKER}`;
}

/**
 * Flatten assistant tool_calls and tool results into transcript lines the web
 * backend can read. Returns only the messages that carry non-text content.
 */
export function renderToolTranscript(messages, style = "marker") {
  const out = [];
  for (const m of Array.isArray(messages) ? messages : []) {
    if (!m || typeof m !== "object") continue;
    if (m.role === "assistant" && Array.isArray(m.tool_calls) && m.tool_calls.length) {
      const text = textOf(m.content);
      const calls = [];
      for (const tc of m.tool_calls) {
        const fn = tc?.function || {};
        let args = fn.arguments;
        if (args && typeof args === "object") args = JSON.stringify(args);
        if (typeof args !== "string" || !args.trim()) args = "{}";
        calls.push(callLine(String(fn.name || ""), args, style));
      }
      const line = text ? `[Assistant]: ${text}\n${calls.join("\n")}` : `[Assistant]: ${calls.join("\n")}`;
      out.push({ role: "assistant", text: line });
    } else if (m.role === "tool") {
      const text = textOf(m.content);
      if (text) out.push({ role: "tool", text: `${RESULT_MARKER} ${m.name || "tool"}: ${text} ${RESULT_MARKER}` });
    }
  }
  return out;
}

// --------------------------------------------------------------------- parsing

function parseCallObject(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  if (!name) return null;
  // A model sometimes echoes the tool schema instead of a call. A definition
  // has description+parameters and no arguments field; treating it as a call
  // would run the wrong function with the schema as arguments.
  if (typeof obj.description === "string" && obj.parameters &&
    obj.arguments === undefined && obj.args === undefined && obj.input === undefined) return null;
  let args = obj.arguments ?? obj.args ?? obj.parameters ?? obj.input ?? {};
  if (typeof args === "string") {
    try { args = JSON.parse(args); } catch { args = {}; }
  }
  if (!args || typeof args !== "object" || Array.isArray(args)) args = {};
  return { name, arguments: args };
}

/** Lenient parse: unescaped inner quotes and trailing commas are common. */
function tolerantJsonParse(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return null;
  try { return JSON.parse(trimmed); } catch {}
  const noTrailing = trimmed.replace(/,(\s*[}\]])/g, "$1");
  try { return JSON.parse(noTrailing); } catch {}
  const nameMatch = noTrailing.match(/"name"\s*:\s*"([^"]+)"/);
  if (!nameMatch) return null;
  const argsMatch = noTrailing.match(/"arguments"\s*:\s*([\s\S]*?)\s*\}\s*$/);
  let args = {};
  if (argsMatch) {
    const inner = argsMatch[1].replace(/,\s*$/, "").replace(/^"/, "").replace(/"$/, "").replace(/\\"/g, '"');
    try { args = JSON.parse(inner); } catch {
      try {
        args = JSON.parse(inner.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_-]*)\s*:/g, '$1"$2":'));
      } catch { args = {}; }
    }
  }
  return { name: nameMatch[1], arguments: args };
}

function markerCandidates(text) {
  const out = [];
  const parts = text.split(MARKER);
  for (let i = 1; i < parts.length; i += 2) out.push(parts[i]);
  return out;
}

/** Every balanced {...} region, so nested arguments survive the scan. */
function balancedObjects(text) {
  const out = [];
  let from = 0;
  while (from < text.length) {
    const start = text.indexOf("{", from);
    if (start < 0) break;
    let depth = 0;
    let inString = false;
    let escaped = false;
    let end = -1;
    for (let i = start; i < text.length; i += 1) {
      const char = text[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') inString = true;
      else if (char === "{") depth += 1;
      else if (char === "}") {
        depth -= 1;
        if (depth === 0) { end = i; break; }
      }
    }
    if (end < 0) break; // unbalanced tail: nothing more to recover
    out.push(text.slice(start, end + 1));
    from = end + 1;
  }
  return out;
}

// ------------------------------------------------- bare-command tool_calls
// Small web models (DeepAI's free tier) often skip the JSON protocol entirely
// and answer with the shell command after the word: "tool_call ls -l /tmp".
// Recover that as a call to the client's shell tool instead of leaking it.

const COMMAND_ARG_KEYS = ["command", "cmd", "script", "input", "code", "shell"];
const SHELL_TOOL_RE = /(?:^|[-_])(bash|shell|sh|exec|command|run|terminal|cmd|powershell|pty|process)(?:$|[-_])/i;

// One per line, optional backticks, payload that is NOT a JSON object.
const BARE_COMMAND_LINE = /^[ \t]*`{0,3}[ \t]*tool_call[ \t]*:?[ \t]+(?!\{)[^\n]*$/gim;

function bareCommandLines(text) {
  const out = [];
  for (const line of String(text ?? "").matchAll(BARE_COMMAND_LINE)) {
    const command = line[0]
      .replace(/^[ \t]*`{0,3}[ \t]*tool_call[ \t]*:?[ \t]+/i, "")
      .replace(/[ \t]*`{0,3}[ \t]*$/, "")
      .trim();
    if (command) out.push(command);
  }
  return out;
}

/** Pick the client's shell-ish tool and the argument key its schema uses. */
function pickCommandTool(body) {
  const { defs } = selectableTools(body);
  if (!defs.length) return null;
  const ranked = defs.map((def) => {
    const properties = def.parameters?.properties || {};
    const key = COMMAND_ARG_KEYS.find((name) => name in properties);
    let score = 0;
    if (SHELL_TOOL_RE.test(def.name)) score += 2;
    if (key) score += 1;
    return { name: def.name, key, score };
  });
  ranked.sort((a, b) => b.score - a.score);
  const best = ranked[0];
  // No guessing: a tool must look shell-ish or expose a command argument.
  // Falling back to "the only tool" would route "edit"/"read" commands wrongly.
  return best.score > 0 ? best : null;
}

function fenceCandidates(text) {
  const out = [];
  // Models often break the line between the fence and the word: "```\ntool_call"
  // instead of "```tool_call". Both shapes are the same block.
  const re = /```\s*tool_call\s*:?([\s\S]*?)```/g;
  for (const m of text.matchAll(re)) out.push(m[1]);
  const loose = text.match(/```(?:json)?\s*([\s\S]*?"name"[\s\S]*?)```/g) || [];
  for (const block of loose) {
    const inner = block.replace(/```(?:json|tool_call)?/g, "").replace(/```/g, "").trim();
    if (inner) out.push(inner);
  }
  return out;
}

// ------------------------------------------------- function-call syntax
// Some models skip the JSON object but still name the function:
//   tool_call: read({"filePath": "/a"})
//   tool_call read(filePath="/a")

/** Parse `key: value, key2="text"` (or JSON) into an arguments object. */
function parseParenArgs(rawArgs) {
  const text = String(rawArgs ?? "").trim();
  if (!text) return {};
  // Arguments already wrapped in braces: read them as the object itself.
  if (/^[{[]/.test(text)) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {}
  }
  try {
    const wrapped = JSON.parse(`{${text}}`);
    if (wrapped && typeof wrapped === "object" && !Array.isArray(wrapped)) return wrapped;
  } catch {}
  const parts = [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  let current = "";
  for (const char of text) {
    if (inString) {
      current += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') { inString = true; current += char; continue; }
    if (char === "{" || char === "[") depth += 1;
    if (char === "}" || char === "]") depth -= 1;
    if (char === "," && depth === 0) { parts.push(current); current = ""; continue; }
    current += char;
  }
  if (current.trim()) parts.push(current);
  const args = {};
  for (const part of parts) {
    const match = part.match(/^\s*([A-Za-z_][\w-]*)\s*[:=]\s*([\s\S]*?)\s*$/);
    if (!match) continue;
    const key = match[1];
    const rawValue = match[2];
    let value = rawValue;
    try {
      value = JSON.parse(rawValue);
    } catch {
      value = rawValue.replace(/^["']|["']$/g, "");
      if (/^-?\d+(\.\d+)?$/.test(value)) value = Number(value);
      else if (value === "true" || value === "false") value = value === "true";
      else if (value === "null") value = null;
    }
    args[key] = value;
  }
  return args;
}

function functionCallCandidates(text) {
  const out = [];
  const re = /(?:^|\n)[ \t]*`{0,3}[ \t]*tool_call[ \t]*:?[ \t]*([A-Za-z_][\w.-]*)\s*\(([\s\S]*?)\)[ \t]*`{0,3}[ \t]*(?=\n|$)/g;
  for (const match of text.matchAll(re)) {
    out.push(parseCallObject({ name: match[1], arguments: parseParenArgs(match[2]) }));
  }
  return out.filter(Boolean);
}

/**
 * Recover tool calls from a model reply.
 * Returns { content, calls } where content is the visible text with the fence
 * lines removed, and calls is an array of { name, arguments }.
 */
export function parseToolCallReply(text, body = null) {
  const raw = String(text ?? "");
  // tool_choice "none" is a hard client opt-out: recovering a call would run a
  // tool the caller explicitly disabled.
  if (body && selectableTools(body).mode === "none") return { content: raw, calls: [] };
  const jsonCandidates = [
    ...fenceCandidates(raw),
    ...markerCandidates(raw),
    ...balancedObjects(raw),
  ];

  const calls = [];
  const seen = new Set();
  const pushCall = (obj) => {
    if (!obj) return;
    const key = `${obj.name}\u0000${JSON.stringify(obj.arguments)}`;
    if (seen.has(key)) return;
    seen.add(key);
    calls.push(obj);
  };

  for (const cand of jsonCandidates) {
    let obj = null;
    try { obj = parseCallObject(JSON.parse(cand.trim())); } catch {}
    if (!obj) obj = parseCallObject(tolerantJsonParse(cand));
    pushCall(obj);
  }
  if (!calls.length) {
    for (const obj of functionCallCandidates(raw)) pushCall(obj);
  }

  let bareUsed = false;
  if (!calls.length && body) {
    // No structured protocol at all: "tool_call <command>" prose shape.
    const commands = bareCommandLines(raw);
    const target = commands.length ? pickCommandTool(body) : null;
    if (target) {
      const key = target.key || "command";
      for (const command of commands) {
        pushCall({ name: target.name, arguments: { [key]: command } });
      }
      bareUsed = true;
    }
  }

  let content = raw;
  if (calls.length) {
    // Strip in a fixed order: payloads first, then the wrappers that carried
    // them, then fences left empty. Every line that still names tool_call in a
    // reply we parsed is protocol noise, so it goes regardless of shape.
    if (bareUsed) content = content.replace(BARE_COMMAND_LINE, "");
    for (const cand of jsonCandidates) {
      const trimmed = cand.trim();
      if (trimmed.length > 2) content = content.split(trimmed).join(" ");
    }
    content = content
      .split(MARKER).join("\n")
      .replace(/```[^\n]*\n?[\s\S]*?```/g, (block) => (/tool_call|"name"\s*:/i.test(block) ? "" : block))
      .replace(/^[ \t]*`{0,3}[ \t]*tool_call\b[^\n]*$/gim, "")
      .replace(/`{1,2}[^`\n]*`{1,2}/g, (span) => (/tool_call/i.test(span) ? "" : span))
      // Fences left empty once their payload was removed ("```json\n\n```").
      .replace(/```[^\n]*\n?\s*```/g, "")
      .replace(/^[ \t]*`{1,3}[ \t]*$/gm, "")
      .replace(/^[ \t]*[(){}[\],;]+[ \t]*$/gm, "")
      .replace(/\{\s*"name"\s*:\s*"[^"]*"[\s\S]*?\}\s*$/g, "")
      .trim();
  }
  const answer = content.match(/<answer>([\s\S]*?)<\/answer>/i);
  if (answer) content = answer[1].trim();
  return { content, calls };
}

// ------------------------------------------------------------------- emission

let idSeq = 0;
export function generateToolCallId() {
  idSeq += 1;
  return `call_${Date.now().toString(36)}${idSeq.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Strip fences and emit OpenAI streaming chunks, then finish_reason. */
export function emitToolCallChunks(chunkFn, ensureRoleFn, calls) {
  if (!calls || !calls.length) return false;
  ensureRoleFn?.();
  calls.forEach((call, index) => {
    chunkFn({
      tool_calls: [
        {
          index,
          id: generateToolCallId(),
          type: "function",
          function: { name: call.name, arguments: JSON.stringify(call.arguments ?? {}) },
        },
      ],
    });
  });
  chunkFn({}, "tool_calls");
  return true;
}

export function buildToolCallResponse({ id, model, messageText, calls, reasoningContent, body }) {
  const message = {
    role: "assistant",
    content: messageText || null,
    tool_calls: calls.map((call) => ({
      id: generateToolCallId(),
      type: "function",
      function: { name: call.name, arguments: JSON.stringify(call.arguments ?? {}) },
    })),
  };
  if (reasoningContent) message.reasoning_content = reasoningContent;
  const outputLen = (messageText ? messageText.length : 0) +
    (reasoningContent ? reasoningContent.length : 0) +
    (calls?.length ? JSON.stringify(calls).length : 0);
  const promptTokens = body ? estimateInputTokens(body) : 0;
  const completionTokens = estimateOutputTokens(outputLen);
  return {
    id: id || `chatcmpl-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, message, finish_reason: "tool_calls" }],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
      estimated: true,
    },
  };
}

export const __selftest = {
  parseToolChoice,
  selectableTools,
  buildToolInstructions,
  buildToolReminder,
  parseToolCallReply,
  renderToolTranscript,
  hasTools,
};