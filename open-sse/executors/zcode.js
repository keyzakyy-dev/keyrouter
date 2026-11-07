// ZCode Start Plan lane for the GLM provider.
//
// The Z.ai account OAuth login already mints a ZCode JWT (providerSpecificData
// .zcodeJwtToken) next to the coding-plan API key. That JWT is admitted by a
// separate gateway, zcode.z.ai, which serves the free "ZCode Start Plan"
// buckets (3M GLM-5.3 + 5M GLM-5.3-Flash per day) without any coding-plan
// entitlement — the exact failure mode that makes api.z.ai answer 429/1113 on
// the paid key.
//
// The gateway enforces a client fingerprint, probed live 2026-11-06:
//   - HTTP 405 code 3012 "unusual activity" unless the body carries the stock
//     ZCode system prefix verbatim as its first two text blocks (exactly three
//     blocks total — a fourth block is rejected too).
//   - HTTP 400 code 1214 unless body.request_id is 6..64 chars.
//   - Authorization: Bearer <jwt>; x-api-key is refused with a bare 401, and
//     any anthropic-beta header re-triggers the 3012 block.
// Verified working on this lane: stream + non-stream, native tool_use, and
// multi-turn tool_result. TLS impersonation is NOT required (plain fetch).
//
// Routing stays opt-in per model: only the allow-listed ids (the two buckets
// the plan actually covers) take this lane, and any lane-specific rejection
// falls back to the normal api.z.ai transport, so accounts without a start
// plan — or with a stale JWT — keep their existing behaviour byte for byte.

import { createHash, randomUUID } from "node:crypto";
import { DefaultExecutor } from "./default.js";
import { ZCODE_SYSTEM_PROMPTS } from "../services/zcodePrompt.js";
import { looksLikeZcodeJwt } from "../services/zcodeProbe.js";

const START_URL = "https://zcode.z.ai/api/v1/zcode-plan/anthropic/v1/messages?beta=true";
const START_USER_AGENT = "ZCode/3.16.3 ai-sdk/anthropic/3.0.81";
// Models the start-plan buckets cover. Anything else answers 400 code 3006
// "model not allowed", so those ids must never take this lane.
const START_MODELS = new Set(["glm-5.3", "glm-5.3-flash"]);
const THIRD_SYSTEM_BLOCK = "Follow the user's instructions and use the available tools when helpful.";

// Stable UUID-shaped device id per connection: the gateway keys its anti-abuse
// state on metadata.user_id and rejects malformed shapes, not on the value.
function deviceMid(credentials) {
  const seed = String(credentials?.connectionId || credentials?.providerSpecificData?.userId || "zcode");
  const bytes = createHash("sha256").update(seed).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// A ZCode JWT is a three-segment JWS; a coding-plan API key is "id.secret"
// (one dot). Accepting the JWT in the API-key field lets the plan lane work
// without an OAuth connection, and the shape check keeps real keys on api.z.ai.
function zcodeJwt(credentials) {
  const stored = String(credentials?.providerSpecificData?.zcodeJwtToken || "").trim();
  if (stored) return stored;
  const key = String(credentials?.apiKey || credentials?.accessToken || "").trim();
  return looksLikeZcodeJwt(key) ? key : "";
}

// OAuth stores the JWT next to the coding-plan key. Accounts that have a real
// plan key keep their existing api.z.ai behaviour unless they explicitly opt in
// (`__zcodeLane: true`): the lane prepends 2.2 KB of ZCode system prompt, which
// must not silently change what paying accounts already receive.
// A real plan key is "id.secret" (not a JWT). When accessToken carries the JWT
// itself, the account has no separate plan key.
function hasSeparatePlanKey(credentials) {
  const key = String(credentials?.apiKey || credentials?.accessToken || "").trim();
  return !!(credentials?.providerSpecificData?.zcodeJwtToken
    && key && !looksLikeZcodeJwt(key));
}

function isStartModel(model) {
  return START_MODELS.has(String(model || "").toLowerCase());
}

// Anthropic only accepts strictly alternating roles after `system` is removed.
function mergeAdjacentRoles(messages) {
  const merged = [];
  for (const message of messages) {
    const last = merged[merged.length - 1];
    if (last && message && last.role === message.role) {
      const blocks = (content) => (typeof content === "string"
        ? [{ type: "text", text: content }]
        : Array.isArray(content) ? content : [{ type: "text", text: String(content ?? "") }]);
      last.content = [...blocks(last.content), ...blocks(message.content)];
    } else if (message) {
      merged.push({ ...message });
    }
  }
  return merged;
}

// The gateway admits exactly three system blocks: the two stock ZCode ones and
// one carrying whatever the client asked for. A fourth is answered 405/3012.
function alignSystem(body) {
  const parts = [];
  const existing = body.system;
  if (Array.isArray(existing)) {
    for (const block of existing) {
      const text = typeof block === "string" ? block : block?.type === "text" ? block.text : "";
      if (typeof text === "string" && text.trim()) parts.push(text);
    }
  } else if (typeof existing === "string" && existing.trim()) {
    parts.push(existing);
  }

  const messages = [];
  let hadSystemMessages = false;
  for (const message of Array.isArray(body.messages) ? body.messages : []) {
    if (message && message.role === "system") {
      hadSystemMessages = true;
      if (Array.isArray(message.content)) {
        for (const block of message.content) {
          if (block?.type === "text" && block.text) parts.push(block.text);
        }
      } else if (typeof message.content === "string" && message.content) {
        parts.push(message.content);
      }
      continue;
    }
    messages.push(message);
  }

  const system = ZCODE_SYSTEM_PROMPTS.map((text) => ({ type: "text", text }));
  system.push({ type: "text", text: parts.length ? parts.join("\n\n") : THIRD_SYSTEM_BLOCK });

  const next = { ...body, system };
  if (hadSystemMessages) next.messages = messages;
  return next;
}

// The plan gateway reports business failures inside an HTTP 200 JSON envelope
// (e.g. {"code":1005,"msg":"exceed quota limit"}); rewrite the status so the
// router's account-fallback logic sees a real error and rotates.
async function normalizeStartPlanResponse(response) {
  if (!response?.ok) return response;
  const ct = (response.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("event-stream") || !ct.includes("json")) return response;
  const text = await response.clone().text().catch(() => "");
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { return response; }
  const code = typeof json?.code === "number" ? json.code : null;
  const failed = (code !== null && code !== 0 && code !== 200)
    || json?.success === false
    || json?.type === "error";
  if (!failed) return response;
  const message = json?.msg || json?.message || json?.error?.message || text;
  // 1005 (quota) and 3009 (concurrency) → 429 so fallback triggers.
  // 3006/3001 (model not allowed / bad request) → 400.
  const status = (code === 1005 || code === 3009) ? 429
    : (code === 3006 || code === 3001) ? 400
    : 502;
  return new Response(text, {
    status,
    statusText: String(message).slice(0, 120),
    headers: response.headers,
  });
}

// Business failures arrive as HTTP 200 envelopes on some paths; surface the
// ones that mean "this lane is not yours" so the caller falls back.
async function laneRejected(response) {
  if (!response) return false;
  if ([401, 403, 405].includes(response.status)) return true;
  if (response.status !== 400) return false;
  const text = await response.clone().text().catch(() => "");
  return /"code"\s*:\s*"?\d+"?/.test(text) || /unusual activity|model not allowed/i.test(text);
}

// api.z.ai answers 429/1113 "Insufficient balance or no resource package" when
// the coding-plan key exists but carries no entitlement. Having a key is proof
// the account can mint one, not that it has quota — so this is the one paid
// error the free lane is allowed to rescue, and only a start-plan model has a
// bucket to rescue it into.
async function paidLaneExhausted(response, model) {
  if (!response || response.status !== 429 || !isStartModel(model)) return false;
  const text = await response.clone().text().catch(() => "");
  return /"?1113"?/.test(text) || /insufficient balance|no resource package/i.test(text);
}

export class ZcodeExecutor extends DefaultExecutor {
  constructor() {
    super("glm");
  }

  laneOn(credentials, model) {
    if (!zcodeJwt(credentials)) return false;
    const flag = credentials?.providerSpecificData?.__zcodeLane;
    if (flag === false) return false;
    // Accounts with only a JWT (free Start Plan, no paid coding-plan key) have
    // no credentials for api.z.ai (it answers 401). Always use the zcode lane;
    // transformRequest normalizes any model name to the free Start Plan bucket.
    if (!hasSeparatePlanKey(credentials)) return true;
    if (!isStartModel(model)) return false;
    return flag === true;
  }

  buildUrl(model, stream, urlIndex = 0, credentials = null) {
    if (this.laneOn(credentials, model)) return START_URL;
    return super.buildUrl(model, stream, urlIndex, credentials);
  }

  transformRequest(model, body, stream, credentials) {
    const transformed = super.transformRequest(model, body, stream, credentials);
    if (!this.laneOn(credentials, model) || !transformed || typeof transformed !== "object") return transformed;

    const next = alignSystem(transformed);
    if (Array.isArray(next.messages)) next.messages = mergeAdjacentRoles(next.messages);

    // Normalize model to one of the two start-plan buckets if needed
    const rawModel = String(next.model || model || "").toLowerCase();
    if (!isStartModel(rawModel)) {
      next.model = rawModel.includes("5.3") && !rawModel.includes("flash") ? "GLM-5.3" : "GLM-5.3-Flash";
    }

    // Anthropic requires max_tokens; the gateway rejects OpenAI-only fields.
    next.max_tokens = next.max_tokens || next.max_completion_tokens || 4096;
    delete next.max_completion_tokens;
    delete next.context_management;
    // Same-format claude→claude skips the translator (which would pin stream),
    // so a client that omitted the flag while accepting SSE would get a JSON
    // body piped through the SSE transform. Mirror the router's decision.
    next.stream = stream !== false;
    for (const key of ["stream_options", "presence_penalty", "frequency_penalty", "logit_bias", "user", "n", "seed"]) {
      delete next[key];
    }

    const requestId = randomUUID();
    next.request_id = requestId;
    next.metadata = {
      ...(next.metadata && typeof next.metadata === "object" ? next.metadata : {}),
      user_id: JSON.stringify({
        device_id: deviceMid(credentials),
        account_uuid: "",
        session_id: `session_${createHash("sha256").update(`${credentials?.connectionId || "zcode"}:${requestId}`).digest("hex").slice(0, 32)}`,
      }),
    };
    return next;
  }

  buildHeaders(credentials, stream = true, url, model, body = null) {
    const headers = super.buildHeaders(credentials, stream, url, model, body);
    if (!this.laneOn(credentials, model)) return headers;

    delete headers["x-api-key"];
    delete headers["X-Api-Key"];
    // Any anthropic-beta value re-triggers the 3012 WAF block on this lane.
    delete headers["anthropic-beta"];
    delete headers["Anthropic-Beta"];
    headers["Authorization"] = `Bearer ${zcodeJwt(credentials)}`;
    headers["User-Agent"] = START_USER_AGENT;
    return headers;
  }

  async execute(args) {
    const result = await super.execute(args);
    const { credentials, model } = args || {};
    // Normalize HTTP 200 business errors (1005/3009/3006/…) into real status
    // codes before any downstream logic checks providerResponse.ok.
    result.response = await normalizeStartPlanResponse(result.response);
    if (!this.laneOn(credentials, model)) {
      // Not on the lane. A paid 429/1113 means the plan key has no entitlement
      // left — the exact account the free Start Plan exists for. Retry once on
      // the lane, on a throwaway opt-in copy so the choice is never persisted.
      // An explicit `false` is the user saying "never route me here", so it wins.
      if (credentials?.providerSpecificData?.__zcodeLane === false) return result;
      if (!zcodeJwt(credentials) || !(await paidLaneExhausted(result?.response, model))) return result;
      try {
        await result.response.body?.cancel?.();
      } catch {
        // Already consumed.
      }
      return super.execute({
        ...args,
        credentials: {
          ...credentials,
          providerSpecificData: { ...(credentials?.providerSpecificData || {}), __zcodeLane: true },
        },
      });
    }
    if (!(await laneRejected(result.response))) return result;

    // The lane credential itself is the JWT (pasted into the API-key field):
    // api.z.ai rejects it, so surface the lane's own error instead of a 401.
    if (!hasSeparatePlanKey(args?.credentials)) return result;

    // Stale JWT or an account without the plan: retry once on the provider's
    // normal transport instead of failing the request. The opt-out rides on a
    // throwaway copy — writing it onto the live credentials would persist
    // `__zcodeLane:false` the next time a token refresh saves providerSpecificData
    // and silently disable the lane for that connection.
    try {
      await result.response.body?.cancel?.();
    } catch {
      // Already consumed.
    }
    return super.execute({
      ...args,
      credentials: {
        ...args.credentials,
        providerSpecificData: {
          ...(args.credentials?.providerSpecificData || {}),
          __zcodeLane: false,
        },
      },
    });
  }
}

export default ZcodeExecutor;
