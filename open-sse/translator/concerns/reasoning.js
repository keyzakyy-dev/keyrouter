import { ROLE } from "../schema/index.js";

// Build OpenAI delta carrying reasoning_content (optional leading assistant role)
export function reasoningDelta(text, withRole = false) {
  return withRole
    ? { role: ROLE.ASSISTANT, reasoning_content: text }
    : { reasoning_content: text };
}

// Lazily add the canonical OpenAI reasoning field when an upstream streams the
// vendor aliases instead: `reasoning` (string) and `reasoning_details[]`
// (OpenRouter-style lanes). Only ever ADDS the field — the aliases stay intact
// for clients that read them — and never touches a delta that already carries
// reasoning_content. Without this, OpenAI-shaped clients see no thinking at all:
// reasoningDelta()/the SSE→JSON aggregator/usage tracking all read
// reasoning_content.
export function liftReasoningAliases(delta) {
  if (!delta || typeof delta !== "object") return delta;
  if (typeof delta.reasoning_content === "string" && delta.reasoning_content) return delta;
  const text = extractReasoningText(delta);
  return text ? { ...delta, reasoning_content: text } : delta;
}

// Extract reasoning text from a streamed OpenAI-compatible delta across vendor shapes:
//   - reasoning_content (GLM, Qwen, DeepSeek, Kimi, Step, Hunyuan)
//   - reasoning (some compat layers)
//   - reasoning_details[] (MiniMax reasoning_split=true): [{ text|content }]
// Returns concatenated reasoning string, or "" when none.
export function extractReasoningText(delta) {
  if (!delta || typeof delta !== "object") return "";
  if (typeof delta.reasoning_content === "string" && delta.reasoning_content) return delta.reasoning_content;
  if (typeof delta.reasoning === "string" && delta.reasoning) return delta.reasoning;
  const details = delta.reasoning_details;
  if (Array.isArray(details)) {
    return details.map((d) => (typeof d === "string" ? d : d?.text || d?.content || "")).join("");
  }
  return "";
}

// Inline <think> splitter — some OpenAI-compatible upstreams (MiniMax M3.x on
// the dahl lane, assorted community gateways) stream reasoning inline in
// `content` wrapped in <think>…</think> instead of a reasoning field. Clients
// then render the raw tags as answer text. This state machine moves tagged
// text into reasoning_content as it arrives, buffering only when a tag is
// split across chunk boundaries.
const THINK_OPEN = "<think>";
const THINK_CLOSE = "</think>";

function findSplit(text, tag, from) {
  const idx = text.indexOf(tag, from);
  if (idx !== -1) return { found: true, idx };
  // Partial suffix match of the tag at the tail (e.g. "<th") — wait for more.
  for (let len = Math.min(tag.length - 1, text.length - from); len > 0; len--) {
    if (text.startsWith(tag.slice(0, len), text.length - len)) {
      return { found: false, partial: text.length - len };
    }
  }
  return { found: false, partial: -1 };
}

/**
 * Create a per-stream think-splitter.
 * feed(deltaText) → { thinking, content } — text reclassified from the delta.
 * flush() → leftover buffered text once the stream ends (unclosed <think>
 * means everything after the opener is thinking).
 */
export function createInlineThinkSplitter() {
  let inThink = false;
  let buffer = "";
  return {
    feed(text) {
      if (typeof text !== "string" || !text) return { thinking: "", content: "" };
      let thinking = "";
      let content = "";
      let cur = buffer + text;
      buffer = "";
      while (cur) {
        if (!inThink) {
          const r = findSplit(cur, THINK_OPEN, 0);
          if (r.found) {
            content += cur.slice(0, r.idx);
            cur = cur.slice(r.idx + THINK_OPEN.length);
            inThink = true;
          } else if (r.partial >= 0) {
            content += cur.slice(0, r.partial);
            buffer = cur.slice(r.partial);
            cur = "";
          } else {
            content += cur;
            cur = "";
          }
        } else {
          const r = findSplit(cur, THINK_CLOSE, 0);
          if (r.found) {
            thinking += cur.slice(0, r.idx);
            cur = cur.slice(r.idx + THINK_CLOSE.length);
            inThink = false;
          } else if (r.partial >= 0) {
            thinking += cur.slice(0, r.partial);
            buffer = cur.slice(r.partial);
            cur = "";
          } else {
            thinking += cur;
            cur = "";
          }
        }
      }
      return { thinking, content };
    },
    flush() {
      const rest = buffer;
      const inThinkNow = inThink;
      buffer = "";
      return inThinkNow ? { thinking: rest, content: "" } : { thinking: "", content: rest };
    },
  };
}

// Non-stream one-shot variant: split a complete message string.
export function splitInlineThink(text) {
  if (typeof text !== "string" || !text) return { thinking: "", content: text || "" };
  const splitter = createInlineThinkSplitter();
  const r = splitter.feed(text);
  const tail = splitter.flush();
  return { thinking: r.thinking + tail.thinking, content: r.content + tail.content };
}
