/**
 * End-to-end check of the shape that broke Claude Code: the upstream answers
 * HTTP 200 with `application/json`, so the client committed to streaming but
 * the body is not SSE. Before the fix the transform emitted only "[DONE]".
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/usageDb.js", () => ({
  appendRequestLog: vi.fn(async () => {}),
  saveRequestDetail: vi.fn(async () => {}),
  saveRequestUsage: vi.fn(async () => {}),
}));

import { handleStreamingResponse } from "../../open-sse/handlers/chatCore/streamingHandler.js";
import { FORMATS } from "../../open-sse/translator/formats.js";

const noop = () => {};

function context(providerResponse) {
  return {
    providerResponse,
    provider: "glm",
    model: "glm-5.3-flash",
    sourceFormat: FORMATS.CLAUDE,
    targetFormat: FORMATS.CLAUDE,
    userAgent: "claude-cli/1.0",
    body: { model: "glm-5.3-flash", stream: true, messages: [] },
    stream: true,
    requestStartTime: Date.now(),
    connectionId: "conn-1",
    apiKey: "test-key",
    clientRawRequest: { endpoint: "/v1/messages" },
    onRequestSuccess: noop,
    reqLogger: { logProviderResponse: noop, logConvertedResponse: noop, logError: noop },
    toolNameMap: null,
    customToolNames: null,
    streamController: { handleComplete: noop, handleError: noop },
    onStreamComplete: noop,
    streamDetailId: "detail-1",
    log: { line: noop, errorLine: noop, warn: noop },
  };
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

describe("HTTP 200 JSON on the streaming path", () => {
  it("surfaces a quota error as a real SSE error frame, not a bare [DONE]", async () => {
    const result = await handleStreamingResponse(
      context(json({ code: 1005, msg: "exceed quota limit", logid: "20261106074617dda9" })),
    );
    const text = await result.response.text();

    // The regression: an empty stream left usage undefined in Claude Code.
    expect(text.trim()).not.toBe("data: [DONE]");
    expect(text).toContain("event: error");
    expect(text).toContain("exceed quota limit");
  });

  it("surfaces a concurrency limit with its own code", async () => {
    const result = await handleStreamingResponse(
      context(json({ code: 3009, msg: "model concurrency limit exceeded" })),
    );
    const text = await result.response.text();
    expect(text).toContain("model concurrency limit exceeded");
  });

  it("completes a JSON success body with message_start carrying usage", async () => {
    const result = await handleStreamingResponse(
      context(json({
        id: "chatcmpl-1", model: "glm-5.3-flash",
        choices: [{ message: { content: "hi" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
      })),
    );
    const text = await result.response.text();
    expect(result.response.status).toBe(200);

    const start = text.split("\n\n").find((f) => f.includes("message_start"));
    expect(start).toBeTruthy();
    const payload = JSON.parse(start.split("data: ")[1]);
    // Exactly the field Claude Code reads when switching models.
    expect(payload.message.usage.input_tokens).toBe(5);
    expect(text).toContain("message_stop");
  });
});
