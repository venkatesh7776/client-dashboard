import "server-only";
import { createGoogleVertex } from "@ai-sdk/google-vertex";
import { getVercelOidcToken } from "@vercel/oidc";
import { ExternalAccountClient } from "google-auth-library";

/**
 * Keyless auth: Vercel's OIDC token is exchanged (Workload Identity Federation)
 * for a short-lived token of a service account that only has "Vertex AI User".
 */
function authClient() {
  const number = process.env.GCP_PROJECT_NUMBER;
  const pool = process.env.GCP_WIF_POOL_ID ?? "vercel";
  const provider = process.env.GCP_WIF_PROVIDER_ID ?? "vercel";
  const sa = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
  if (!number || !sa) throw new Error("Missing GCP_PROJECT_NUMBER or GCP_SERVICE_ACCOUNT_EMAIL");
  const client = ExternalAccountClient.fromJSON({
    type: "external_account",
    audience: `//iam.googleapis.com/projects/${number}/locations/global/workloadIdentityPools/${pool}/providers/${provider}`,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${sa}:generateAccessToken`,
    subject_token_supplier: { getSubjectToken: () => getVercelOidcToken() },
  });
  if (!client) throw new Error("Could not create Google auth client");
  return client;
}

let cached: ReturnType<typeof createGoogleVertex> | null = null;

export function vertex() {
  if (cached) return cached;
  cached = createGoogleVertex({
    project: process.env.GCP_PROJECT_ID,
    location: process.env.GCP_LOCATION ?? "global",
    googleAuthOptions: { authClient: authClient() },
  });
  return cached;
}

export const AGENT_MODEL = process.env.AGENT_MODEL ?? "gemini-3.8-flash";
export const TRANSCRIBE_MODEL = process.env.TRANSCRIBE_MODEL ?? "gemini-3.5-transcribe";
