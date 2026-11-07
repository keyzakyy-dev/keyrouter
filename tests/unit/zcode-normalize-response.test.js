/**
 * Verify that ZCode executor rewrites HTTP 200 business-error envelopes
 * (1005 quota / 3009 concurrency) into real HTTP status codes so the
 * router's account-fallback logic sees them.
 */

import { describe, expect, it, vi } from "vitest";

// The executor imports from @/lib/usageDb via the handler chain; stub it.
vi.mock("@/lib/usageDb.js", () => ({
  appendRequestLog: vi.fn(async () => {}),
  saveRequestDetail: vi.fn(async () => {}),
  saveRequestUsage: vi.fn(async () => {}),
}));

import { ZcodeExecutor } from "../../open-sse/executors/zcode.js";

// Minimal stub: super.execute() returns a fake provider response.
class TestableZcodeExecutor extends ZcodeExecutor {
  _fakeResponse = null;
  async execute(args) {
    // Skip the real DefaultExecutor.execute — just run normalizeStartPlanResponse
    // by calling the real ZcodeExecutor.execute with a stubbed super.
    return { response: this._fakeResponse };
  }
}

// We can't easily stub super.execute, so test the normalizeStartPlanResponse
// function directly by importing and calling the executor's execute flow.
// Instead, extract and test the function via a simpler approach.

// Re-import the module to access normalizeStartPlanResponse indirectly
// through the executor's execute method.

describe("ZCode normalizeStartPlanResponse", () => {
  // Direct unit test of the function by re-implementing the check inline,
  // since the function is not exported. We test through the executor instead.

  it("rewrites 1005 quota error from HTTP 200 to 429", async () => {
    const body = { code: 1005, msg: "exceed quota limit", logid: "test" };
    const upstream = new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

    // Call the private function via dynamic import workaround:
    // import the module and build a minimal executor that exposes the result.
    const mod = await import("../../open-sse/executors/zcode.js");
    const Executor = mod.ZcodeExecutor || mod.default;
    const exec = new Executor();

    // Monkey-patch: replace super.execute to return our fake response
    const origExecute = Object.getPrototypeOf(Object.getPrototypeOf(exec)).execute;
    Object.getPrototypeOf(Object.getPrototypeOf(exec)).execute = async function () {
      return { response: upstream };
    };

    try {
      const result = await exec.execute({
        credentials: { apiKey: "test.key" },
        model: "glm-5.3-flash",
      });
      expect(result.response.status).toBe(429);
      const text = await result.response.text();
      expect(text).toContain("exceed quota limit");
    } finally {
      Object.getPrototypeOf(Object.getPrototypeOf(exec)).execute = origExecute;
    }
  });

  it("rewrites 3009 concurrency error from HTTP 200 to 429", async () => {
    const body = { code: 3009, msg: "model concurrency limit exceeded" };
    const upstream = new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

    const mod = await import("../../open-sse/executors/zcode.js");
    const Executor = mod.ZcodeExecutor || mod.default;
    const exec = new Executor();

    const origExecute = Object.getPrototypeOf(Object.getPrototypeOf(exec)).execute;
    Object.getPrototypeOf(Object.getPrototypeOf(exec)).execute = async function () {
      return { response: upstream };
    };

    try {
      const result = await exec.execute({
        credentials: { apiKey: "test.key" },
        model: "glm-5.3-flash",
      });
      expect(result.response.status).toBe(429);
    } finally {
      Object.getPrototypeOf(Object.getPrototypeOf(exec)).execute = origExecute;
    }
  });

  it("leaves a real SSE stream untouched", async () => {
    const upstream = new Response("event: message_start\ndata: {}\n\n", {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    });

    const mod = await import("../../open-sse/executors/zcode.js");
    const Executor = mod.ZcodeExecutor || mod.default;
    const exec = new Executor();

    const origExecute = Object.getPrototypeOf(Object.getPrototypeOf(exec)).execute;
    Object.getPrototypeOf(Object.getPrototypeOf(exec)).execute = async function () {
      return { response: upstream };
    };

    try {
      const result = await exec.execute({
        credentials: { apiKey: "test.key" },
        model: "glm-5.3-flash",
      });
      // SSE content-type → no rewrite
      expect(result.response.status).toBe(200);
    } finally {
      Object.getPrototypeOf(Object.getPrototypeOf(exec)).execute = origExecute;
    }
  });
});

describe("errorConfig concurrency/quota rules", () => {
  it("concurrency limit triggers fallback", async () => {
    const { checkFallbackError } = await import("../../open-sse/services/accountFallback.js");
    const result = checkFallbackError(429, "model concurrency limit exceeded", 0, "glm");
    expect(result.shouldFallback).toBe(true);
    expect(result.cooldownMs).toBeGreaterThan(0);
  });

  it("exceed quota triggers fallback with backoff", async () => {
    const { checkFallbackError } = await import("../../open-sse/services/accountFallback.js");
    const result = checkFallbackError(429, "[1005]: exceed quota limit", 0, "glm");
    expect(result.shouldFallback).toBe(true);
    expect(result.newBackoffLevel).toBe(1);
  });
});
