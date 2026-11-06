import { AI_PROVIDERS } from "@/shared/constants/providers";

export function usesAwsCredentialForm(provider) {
  return AI_PROVIDERS[provider]?.credentialForm === "aws";
}

// Credentials stored inside providerSpecificData never leave the server: the
// dashboard only needs non-secret metadata (region, org, baseUrl, ...). The
// ZCode JWT is the whole credential for the GLM start-plan lane, so leaking it
// here would hand out the account.
const SECRET_PSD_FIELDS = ["sessionToken", "zcodeJwtToken"];

export function toProviderConnectionResponse(connection) {
  const { apiKey, accessToken, refreshToken, idToken, ...safe } = connection;

  if (!connection.providerSpecificData) {
    return safe;
  }

  const providerSpecificData = { ...connection.providerSpecificData };
  for (const field of SECRET_PSD_FIELDS) delete providerSpecificData[field];
  return { ...safe, providerSpecificData };
}
