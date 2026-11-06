// Probe for the ZCode Start Plan credential.
//
// The free lane's credential is a ZCode JWT (three JWS segments, no dotted
// "id.secret" shape), not an api.z.ai API key: api.z.ai answers 401 for it. A
// shape check keeps real coding-plan keys on the paid transport.
//
// A plain GET is useless here (the gateway exposes no /models or /user route),
// and the smallest viable probe is still a chat call, so the body carries the
// same four requirements the executor sends: stock system prefix, request_id,
// metadata.user_id, Bearer auth.

import { randomUUID } from "node:crypto";
import { ZCODE_SYSTEM_PROMPTS } from "./zcodePrompt.js";

const PROBE_URL = "https://zcode.z.ai/api/v1/zcode-plan/anthropic/v1/messages?beta=true";
const PROBE_MODEL = "GLM-5.3-Flash";
const PROBE_USER_AGENT = "ZCode/3.16.3 ai-sdk/anthropic/3.0.81";

export function looksLikeZcodeJwt(value) {
  const parts = String(value || "").trim().split(".");
  return parts.length === 3 && parts.every((part) => part.length > 8);
}

export function buildZcodeProbeBody() {
  return {
    model: PROBE_MODEL,
    max_tokens: 16,
    system: ZCODE_SYSTEM_PROMPTS.map((text) => ({ type: "text", text })).concat([
      { type: "text", text: "Follow the user's instructions and use the available tools when helpful." },
    ]),
    messages: [{ role: "user", content: "Reply with the single word OK." }],
    metadata: {
      user_id: JSON.stringify({ device_id: randomUUID(), account_uuid: "", session_id: randomUUID() }),
    },
    request_id: randomUUID(),
    stream: false,
  };
}

/**
 * @param {string} jwt
 * @param {(url: string, init: object) => Promise<Response>} [fetchImpl]
 * @returns {Promise<{ valid: boolean, error: string|null }>}
 */
export async function probeZcodeJwt(jwt, fetchImpl = fetch) {
  if (!looksLikeZcodeJwt(jwt)) return { valid: false, error: "Not a ZCode JWT" };
  try {
    const res = await fetchImpl(PROBE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${String(jwt).trim()}`,
        "anthropic-version": "2023-06-01",
        "User-Agent": PROBE_USER_AGENT,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildZcodeProbeBody()),
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) return { valid: true, error: null };
    const text = await res.text().catch(() => "");
    // 405/3012 = the WAF rejected the fingerprint, never a credential verdict.
    if (res.status === 405 && /3012|unusual activity/i.test(text)) {
      return { valid: true, error: null };
    }
    return { valid: false, error: `ZCode JWT rejected (HTTP ${res.status})` };
  } catch (error) {
    return { valid: false, error: `ZCode probe failed: ${error.message}` };
  }
}
