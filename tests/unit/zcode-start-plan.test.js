/**
 * Unit tests for the ZCode Start Plan lane on the GLM provider.
 *
 * The lane only works when all four gateway requirements hold at once
 * (stock 2-block system prefix + exactly one third block, request_id,
 * metadata.user_id JSON, Bearer JWT with no anthropic-beta). Each is asserted
 * here so a refactor cannot silently turn every free request into 405/3012.
 */

import { describe, it, expect, vi } from "vitest";
import { ZcodeExecutor } from "../../open-sse/executors/zcode.js";
import { DefaultExecutor } from "../../open-sse/executors/default.js";
import { getExecutor } from "../../open-sse/executors/index.js";
import { looksLikeZcodeJwt } from "../../open-sse/services/zcodeProbe.js";
import { ZCODE_SYSTEM_PROMPTS } from "../../open-sse/services/zcodePrompt.js";
import { PROVIDER_MODELS } from "../../open-sse/config/providerModels.js";
import { getModelTargetFormat, getModelSupportedFormats } from "../../open-sse/config/providerModels.js";

const JWT = `${"a".repeat(24)}.${"b".repeat(24)}.${"c".repeat(24)}`;
const API_KEY = "939fdca1efee402bae4866ea5461ec6e.4rK2JbHhxMK8FBHg";

const credentials = (apiKey = JWT) => ({
  apiKey,
  connectionId: "conn-zcode-1",
  providerSpecificData: {},
});

const executor = new ZcodeExecutor();
const transform = (model, body, creds = credentials()) =>
  executor.transformRequest(model, structuredClone(body), false, creds);

const claudeBody = () => ({
  model: "glm-5.3",
  max_tokens: 128,
  system: [{ type: "text", text: "You are Claude Code.", cache_control: { type: "ephemeral" } }],
  messages: [
    { role: "system", content: "extra system turn" },
    { role: "user", content: "hi" },
  ],
});

describe("lane gating", () => {
  it("registers the glm provider executor as ZcodeExecutor", () => {
    expect(getExecutor("glm")).toBeInstanceOf(ZcodeExecutor);
  });

  it("routes the start-plan models to zcode.z.ai", () => {
    expect(executor.buildUrl("glm-5.3", false, 0, credentials())).toContain("zcode.z.ai");
    expect(executor.buildUrl("glm-5.3-flash", true, 0, credentials())).toContain("zcode.z.ai");
  });

  it("keeps non-plan models on the normal api.z.ai transport", () => {
    const url = executor.buildUrl("glm-5.2", false, 0, credentials());
    expect(url).toContain("api.z.ai");
    expect(url).not.toContain("zcode.z.ai");
  });

  it("keeps real API keys (dotted id.secret) on api.z.ai", () => {
    const url = executor.buildUrl("glm-5.3", false, 0, credentials(API_KEY));
    expect(url).toContain("api.z.ai");
  });

  it("honours the per-request lane opt-out", () => {
    const creds = { ...credentials(), providerSpecificData: { __zcodeLane: false } };
    expect(executor.buildUrl("glm-5.3", false, 0, creds)).toContain("api.z.ai");
  });

  it("does not mutate the caller's credentials when falling back", async () => {
    // Fallback only exists when a real coding-plan key sits next to the JWT
    // (a pasted JWT has nothing to fall back to — api.z.ai 401s it).
    const original = {
      ...credentials(API_KEY),
      providerSpecificData: { zcodeJwtToken: JWT, __zcodeLane: true },
    };
    const calls = [];
    const spy = vi
      .spyOn(DefaultExecutor.prototype, "execute")
      .mockImplementation(async (args) => {
        calls.push(args.credentials);
        return calls.length === 1
          ? { response: new Response('{"error":{"code":3006}}', { status: 400 }), url: "lane" }
          : { response: new Response("{}", { status: 200 }), url: "paid" };
      });
    try {
      const result = await executor.execute({
        model: "glm-5.3",
        body: claudeBody(),
        stream: false,
        credentials: original,
        log: { debug() {}, warn() {}, info() {}, error() {}, line() {}, errorLine() {} },
      });
      expect(result.response.status).toBe(200);
    } finally {
      spy.mockRestore();
    }
    expect(calls).toHaveLength(2);
    expect(calls[0].providerSpecificData.__zcodeLane).toBe(true);
    expect(calls[1].providerSpecificData.__zcodeLane).toBe(false);
    // Persisting the flag would disable the lane for that connection forever.
    expect(original.providerSpecificData.__zcodeLane).toBe(true);
  });

  it("keeps paying accounts (JWT + plan key) on api.z.ai unless explicitly opted in", () => {
    const paid = { ...credentials(API_KEY), providerSpecificData: { zcodeJwtToken: JWT } };
    expect(executor.buildUrl("glm-5.3", false, 0, paid)).toContain("api.z.ai");
    const optedIn = { ...paid, providerSpecificData: { zcodeJwtToken: JWT, __zcodeLane: true } };
    expect(executor.buildUrl("glm-5.3", false, 0, optedIn)).toContain("zcode.z.ai");
  });
});

describe("JWT shape", () => {
  it("accepts a three-segment JWS", () => {
    expect(looksLikeZcodeJwt(JWT)).toBe(true);
  });

  it("rejects a coding-plan API key", () => {
    expect(looksLikeZcodeJwt(API_KEY)).toBe(false);
  });
});

describe("body alignment", () => {
  it("emits exactly the two stock prompts plus one client block", () => {
    const body = transform("glm-5.3", claudeBody());
    expect(body.system).toHaveLength(3);
    expect(body.system.map((b) => b.text)).toEqual([
      ZCODE_SYSTEM_PROMPTS[0],
      ZCODE_SYSTEM_PROMPTS[1],
      "You are Claude Code.\n\nextra system turn",
    ]);
  });

  it("falls back to a stock third block when the client sends no system", () => {
    const body = transform("glm-5.3", { model: "glm-5.3", messages: [{ role: "user", content: "hi" }] });
    expect(body.system).toHaveLength(3);
    expect(body.system[2].text.length).toBeGreaterThan(0);
  });

  it("hoists system turns out of messages", () => {
    const body = transform("glm-5.3", claudeBody());
    expect(body.messages.some((m) => m.role === "system")).toBe(false);
  });

  it("adds a 6..64 char request_id", () => {
    const body = transform("glm-5.3", claudeBody());
    expect(typeof body.request_id).toBe("string");
    expect(body.request_id.length).toBeGreaterThanOrEqual(6);
    expect(body.request_id.length).toBeLessThanOrEqual(64);
  });

  it("carries metadata.user_id as the gateway's JSON shape", () => {
    const body = transform("glm-5.3", claudeBody());
    const userId = JSON.parse(body.metadata.user_id);
    expect(Object.keys(userId).sort()).toEqual(["account_uuid", "device_id", "session_id"]);
    expect(userId.account_uuid).toBe("");
    expect(userId.device_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("drops OpenAI-only fields the gateway rejects", () => {
    const body = transform("glm-5.3", {
      ...claudeBody(),
      stream_options: { include_usage: true },
      presence_penalty: 0,
      seed: 7,
      context_management: { edits: [] },
    });
    for (const key of ["stream_options", "presence_penalty", "seed", "context_management"]) {
      expect(body[key]).toBeUndefined();
    }
  });

  it("leaves non-plan models untouched", () => {
    const body = transform("glm-5.2", claudeBody());
    expect(body.request_id).toBeUndefined();
    expect(body.metadata).toBeUndefined();
  });

  // Same-format claude→claude skips the translator, so without an explicit flag
  // an SSE-accepting client that omitted `stream` got a JSON body piped through
  // the SSE transform (chunk-less, "[DONE]" only).
  it("mirrors the router's streaming decision into body.stream", () => {
    const streaming = executor.transformRequest("glm-5.3", claudeBody(), true, credentials());
    expect(streaming.stream).toBe(true);
    const json = executor.transformRequest("glm-5.3", claudeBody(), false, credentials());
    expect(json.stream).toBe(false);
  });
});

describe("headers", () => {
  const url = "https://zcode.z.ai/api/v1/zcode-plan/anthropic/v1/messages?beta=true";

  it("uses Bearer auth and never x-api-key or anthropic-beta", () => {
    const body = transform("glm-5.3", claudeBody());
    const headers = executor.buildHeaders(credentials(), false, url, "glm-5.3", body);
    expect(headers.Authorization).toBe(`Bearer ${JWT}`);
    expect(headers["x-api-key"]).toBeUndefined();
    expect(headers["anthropic-beta"]).toBeUndefined();
    expect(headers["Anthropic-Beta"]).toBeUndefined();
    expect(headers["User-Agent"]).toContain("ZCode/");
  });

  it("leaves the default x-api-key headers on non-plan models", () => {
    const headers = executor.buildHeaders(credentials(API_KEY), false, url, "glm-5.2", {});
    expect(headers["x-api-key"]).toBe(API_KEY);
    expect(headers.Authorization).toBeUndefined();
  });
});

describe("OAuth without a coding plan", () => {
  it("still completes the login when no api_keys can be minted", async () => {
    const { default: glmOauthProvider } = await import("../../src/lib/oauth/providers/glm.js");
    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

    vi.stubGlobal("fetch", vi.fn(async (url) => {
      const href = String(url);
      if (href.startsWith("https://zcode.z.ai/api/v1/oauth/cli/poll/")) {
        return json({ code: 0, data: { status: "ready", token: JWT, user: { user_id: "u-1", name: "Free" },
          zai: { access_token: "zai-oauth-token" } } });
      }
      if (href === "https://api.z.ai/api/auth/z/login") return json({ code: 200, data: { access_token: "biz" } });
      // Free accounts have no organization/project → the key derivation throws.
      if (href === "https://api.z.ai/api/biz/customer/getCustomerInfo") return json({ code: 200, data: { organizations: [] } });
      return json({ code: 500, msg: `unexpected ${href}` }, 500);
    }));

    try {
      const result = await glmOauthProvider.pollToken(glmOauthProvider.config, "flow-1", null, { _zcodePollToken: "t" });
      expect(result.ok).toBe(true);
      expect(result.data.access_token).toBe("");
      expect(result.data._zcodeJwtToken).toBe(JWT);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("credential exposure", () => {
  it("never returns the JWT through the provider connection API shape", async () => {
    const { toProviderConnectionResponse } = await import("../../src/lib/providerConnectionResponse.js");
    const safe = toProviderConnectionResponse({
      id: "c1",
      provider: "glm",
      apiKey: JWT,
      providerSpecificData: { zcodeJwtToken: JWT, connectionProxyUrl: "" },
    });
    expect(JSON.stringify(safe)).not.toContain(JWT);
    expect(safe.providerSpecificData).toEqual({ connectionProxyUrl: "" });
  });
});

describe("registry wiring", () => {
  it("declares the claude wire for both start-plan models", () => {
    for (const id of ["glm-5.3", "glm-5.3-flash"]) {
      expect(getModelTargetFormat("glm", id)).toBe("claude");
      expect(getModelSupportedFormats("glm", id)).toEqual(["claude"]);
    }
  });

  it("leaves the paid models on the default transport", () => {
    expect(getModelTargetFormat("glm", "glm-5.2")).toBeNull();
    expect(PROVIDER_MODELS.glm.some((m) => m.id === "glm-5.3")).toBe(true);
  });
});
