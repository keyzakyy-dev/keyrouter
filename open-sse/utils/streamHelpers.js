import { FORMATS } from "../translator/formats.js";
import { fallbackToolCallId } from "../translator/concerns/toolCall.js";
import { buildErrorBody } from "./error.js";
import { openAICompletionToClaudeMessage } from "../translator/concerns/claudeMessage.js";
import { SSE_DONE } from "./sseConstants.js";

const sharedEncoder = new TextEncoder();

// Parse SSE data line
export function parseSSELine(line, format = null) {
  if (!line) return null;

  // NDJSON format (Ollama): raw JSON lines without "data:" prefix
  if (format === FORMATS.OLLAMA) {
    const trimmed = line.trim();
    if (trimmed.startsWith("{")) {
      try {
        return JSON.parse(trimmed);
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  // Standard SSE format: "data: {...}"
  if (line.charCodeAt(0) !== 100) return null; // 'd' = 100

  const data = line.slice(5).trim();
  if (data === "[DONE]") return { done: true };

  try {
    return JSON.parse(data);
  } catch (error) {
    if (data.length > 0 && data.length < 1000) {
      console.log(`[WARN] Failed to parse SSE line (${data.length} chars): ${data.substring(0, 100)}...`);
    }
    return null;
  }
}

// Check if chunk has valuable content (not empty)
export function hasValuableContent(chunk, format) {
  // OpenAI format
  if (format === FORMATS.OPENAI && chunk.choices?.[0]?.delta) {
    const delta = chunk.choices[0].delta;
    return delta.content && delta.content !== "" ||
           delta.reasoning_content && delta.reasoning_content !== "" ||
           delta.tool_calls && delta.tool_calls.length > 0 ||
           chunk.choices[0].finish_reason ||
           delta.role;
  }

  // Claude format
  if (format === FORMATS.CLAUDE) {
    const isContentBlockDelta = chunk.type === "content_block_delta";
    const hasText = chunk.delta?.text && chunk.delta.text !== "";
    const hasThinking = chunk.delta?.thinking && chunk.delta.thinking !== "";
    const hasInputJson = chunk.delta?.partial_json && chunk.delta.partial_json !== "";
    
    if (isContentBlockDelta && !hasText && !hasThinking && !hasInputJson) {
      return false;
    }
    return true;
  }

  return true; // Other formats: keep all chunks
}

// Ensure every streamed tool_call carries an id.
//
// OpenAI's streaming contract: the id and function.name arrive on the FIRST
// fragment of a tool call; later fragments carry only `index` + argument
// deltas. Some providers instead open a brand-new `index` in a late fragment
// and omit the id entirely. Strict OpenAI-compatible clients
// (@ai-sdk/openai-compatible) then throw
// "AI_InvalidResponseDataError: Expected 'id' to be a string." and abort the
// whole turn.
//
// Fix: remember the id per tool-call index, and mint one when a fragment
// opens an index the client has not seen yet. The id must be stable for the
// rest of the call, so a later fragment with the same index reuses it.
//
// Returns true when a chunk was modified.
export function ensureStreamToolCallIds(chunk, seenIds) {
  if (!chunk?.choices?.length) return false;
  let changed = false;

  for (const choice of chunk.choices) {
    const calls = choice?.delta?.tool_calls;
    if (!Array.isArray(calls)) continue;

    for (const tc of calls) {
      if (!tc || typeof tc !== "object") continue;

      if (typeof tc.id === "string" && tc.id.length > 0) {
        if (tc.index !== undefined) seenIds.set(tc.index, tc.id);
        continue;
      }

      // No id on this fragment. Reuse the one already seen for this index, or
      // mint one when the index is new to the client.
      const known = tc.index !== undefined ? seenIds.get(tc.index) : undefined;
      const id = known || fallbackToolCallId(tc.index);
      tc.id = id;
      if (tc.index !== undefined) seenIds.set(tc.index, id);
      changed = true;
    }
  }

  return changed;
}

// Fix invalid id (generic or too short)
export function fixInvalidId(parsed) {
  if (parsed.id && (parsed.id === "chat" || parsed.id === "completion" || parsed.id.length < 8)) {
    const fallbackId = parsed.extend_fields?.requestId || 
                      parsed.extend_fields?.traceId || 
                      Date.now().toString(36);
    parsed.id = `chatcmpl-${fallbackId}`;
    return true;
  }
  return false;
}

function cleanUsagePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }

  let cleaned = payload;

  if ("usage" in cleaned) {
    if (cleaned.usage === null) {
      const { usage, ...payloadWithoutUsage } = cleaned;
      cleaned = payloadWithoutUsage;
    } else if (typeof cleaned.usage === "object" && cleaned.usage.perf_metrics === null) {
      const { perf_metrics, ...usageWithoutPerf } = cleaned.usage;
      cleaned = { ...cleaned, usage: usageWithoutPerf };
    }
  }

  if (cleaned.response && typeof cleaned.response === "object" && !Array.isArray(cleaned.response)) {
    const cleanedResponse = cleanUsagePayload(cleaned.response);
    if (cleanedResponse !== cleaned.response) {
      cleaned = { ...cleaned, response: cleanedResponse };
    }
  }

  return cleaned;
}

// Format output as SSE
export function formatSSE(data, sourceFormat) {
  if (data === null || data === undefined) return "data: null\n\n";
  if (data && data.done) return "data: [DONE]\n\n";

  // OpenAI Responses API format
  if (data && data.event && data.data) {
    const cleanedEventData = cleanUsagePayload(data.data);
    return `event: ${data.event}\ndata: ${JSON.stringify(cleanedEventData)}\n\n`;
  }

  data = cleanUsagePayload(data);

  // Claude format
  if (sourceFormat === FORMATS.CLAUDE && data && data.type) {
    return `event: ${data.type}\ndata: ${JSON.stringify(data)}\n\n`;
  }

  return `data: ${JSON.stringify(data)}\n\n`;
}

// Terminal frames for a stream that aborted after HTTP 200 was already sent, so
// the status code can no longer change. OpenAI-compatible clients (openai-python
// raises APIError on any `data:` payload carrying an `error` key, checked before
// [DONE]) need the error frame first, then [DONE]; Anthropic clients need
// `event: error`. Never fabricate a successful finish_reason instead.
//
// Returns encoded bytes: onAbortTerminal callbacks are enqueued verbatim, same
// as buildAbortedResponsesTerminalBytes.
//
// NOTE: non-SSE client formats (Ollama NDJSON) get an SSE frame here — dead in
// practice because detectFormatByEndpoint never resolves to OLLAMA.
export function buildStreamErrorBytes(statusCode, message, clientFormat) {
  const { error } = buildErrorBody(statusCode, message);

  const sse = clientFormat === FORMATS.CLAUDE
    ? formatSSE({ type: "error", error }, FORMATS.CLAUDE)
    : formatSSE({ error }, clientFormat) + SSE_DONE;

  return sharedEncoder.encode(sse);
}

// Does this JSON body report an upstream failure? Providers answer business
// errors with HTTP 200 (Z.ai code 1005/3009, e.g. {"code":1005,"msg":"exceed
// quota limit"}), so the status line alone cannot be trusted.
function jsonErrorEnvelope(body) {
  if (!body || typeof body !== "object") return null;
  if (Array.isArray(body)) return null;
  // OpenAI / Anthropic envelope
  const nested = body.error;
  if (nested && typeof nested === "object") {
    const msg = typeof nested.message === "string" ? nested.message
      : typeof body.msg === "string" ? body.msg : null;
    if (msg) return { status: Number(nested.code) || null, message: msg };
    if (typeof nested === "string" && nested) return { status: null, message: nested };
  }
  // Anthropic's own top-level error type
  if (body.type === "error" && body.error) return jsonErrorEnvelope({ error: body.error });
  // Z.ai business envelope: {code:<number>, msg:<string>} with no payload
  if (typeof body.code === "number" && body.code !== 0 && typeof body.msg === "string") {
    return { status: null, message: `[${body.code}]: ${body.msg}` };
  }
  return null;
}

// Convert a non-SSE JSON body into the SSE frames the client format expects.
// A success body becomes one delta + a terminal frame carrying usage, so a
// client that already committed to streaming still completes cleanly. An error
// envelope becomes a real error frame — never an empty stream.
export function buildJsonBodyToSSE(body, upstreamStatus, clientFormat) {
  const err = jsonErrorEnvelope(body);
  if (err) {
    const status = err.status && err.status >= 400 && err.status <= 599
      ? err.status
      : (upstreamStatus >= 400 ? upstreamStatus : 502);
    return new TextDecoder().decode(buildStreamErrorBytes(status, err.message, clientFormat));
  }

  if (clientFormat === FORMATS.CLAUDE) {
    // Anthropic clients need message_start (which carries usage) before any
    // content block, or they fail reading usage.input_tokens.
    const message = openAICompletionToClaudeMessage(body);
    return [
      formatSSE({ type: "message_start", message: { ...message, content: [], stop_reason: null } }, FORMATS.CLAUDE),
      ...(message.content || []).map((block, index) =>
        block.type === "text"
          ? formatSSE({ type: "content_block_start", index, content_block: { type: "text", text: "" } }, FORMATS.CLAUDE)
            + formatSSE({ type: "content_block_delta", index, delta: { type: "text_delta", text: block.text || "" } }, FORMATS.CLAUDE)
            + formatSSE({ type: "content_block_stop", index }, FORMATS.CLAUDE)
          : formatSSE({ type: "content_block_start", index, content_block: block }, FORMATS.CLAUDE)
            + formatSSE({ type: "content_block_stop", index }, FORMATS.CLAUDE)),
      formatSSE({ type: "message_delta", delta: { stop_reason: message.stop_reason || "end_turn" }, usage: message.usage }, FORMATS.CLAUDE),
      formatSSE({ type: "message_stop" }, FORMATS.CLAUDE),
    ].join("");
  }

  return formatSSE(body, clientFormat) + SSE_DONE;
}
