// Friendly display labels for variant backings (display only).
// A variant stores its backing in the routable node-id form, e.g.
//   openai-compatible-chat-<uuid>/deepseek-ai/DeepSeek-V4-Flash
// For display we replace the routable node id with its friendly prefix, so
// the user sees something like `tokenjuice/deepseek-ai/…` instead of a long
// opaque UUID. Matching/routing always use the stored node-id form.

// Build { nodeId: prefix } from the provider-nodes payload.
export function nodePrefixById(nodes = []) {
  const out = {};
  if (!Array.isArray(nodes)) return out;
  for (const n of nodes) {
    if (n && typeof n.id === "string" && n.id && typeof n.prefix === "string" && n.prefix) {
      out[n.id] = n.prefix;
    }
  }
  return out;
}

// Replace a leading node-id segment with its friendly prefix (if mapped).
export function displayBacking(model, prefixes = {}) {
  if (typeof model !== "string" || !model) return model || "";
  const slash = model.indexOf("/");
  if (slash <= 0) return model;
  const head = model.slice(0, slash);
  const rest = model.slice(slash + 1);
  const friendly = Object.prototype.hasOwnProperty.call(prefixes, head) ? prefixes[head] : head;
  return `${friendly}/${rest}`;
}
