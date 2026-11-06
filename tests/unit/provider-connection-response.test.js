/**
 * The connections API must never hand back credentials that live inside
 * providerSpecificData — the dashboard only needs non-secret metadata.
 */

import { describe, it, expect } from "vitest";
import { toProviderConnectionResponse } from "../../src/lib/providerConnectionResponse.js";

const JWT = `${"a".repeat(24)}.${"b".repeat(24)}.${"c".repeat(24)}`;

describe("toProviderConnectionResponse", () => {
  it("strips credentials stored in providerSpecificData", () => {
    const safe = toProviderConnectionResponse({
      id: "c1",
      provider: "glm",
      apiKey: JWT,
      providerSpecificData: { zcodeJwtToken: JWT, connectionProxyUrl: "" },
    });
    expect(JSON.stringify(safe)).not.toContain(JWT);
    expect(safe.providerSpecificData).toEqual({ connectionProxyUrl: "" });
  });

  it("keeps non-secret metadata for providers without secrets", () => {
    const safe = toProviderConnectionResponse({
      id: "c2",
      provider: "azure",
      providerSpecificData: { azureEndpoint: "https://x.openai.azure.com", deployment: "gpt" },
    });
    expect(safe.providerSpecificData).toEqual({
      azureEndpoint: "https://x.openai.azure.com",
      deployment: "gpt",
    });
  });

  it("always drops apiKey/accessToken/refreshToken/idToken", () => {
    const safe = toProviderConnectionResponse({
      id: "c3",
      provider: "glm",
      apiKey: "k",
      accessToken: "a",
      refreshToken: "r",
      idToken: "i",
    });
    expect(safe).not.toHaveProperty("apiKey");
    expect(safe).not.toHaveProperty("accessToken");
    expect(safe).not.toHaveProperty("refreshToken");
    expect(safe).not.toHaveProperty("idToken");
  });
});
