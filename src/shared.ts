import createClient, { type Client } from "openapi-fetch";
import type { paths } from "./schema.js";
import type { Environment, LegacyEnvironment } from "./types.js";

export type OrcaApiClient = Client<paths, `${string}/${string}`>;

export function createOrcaApiClient(
  apiKey: string,
  baseUrl: string
): OrcaApiClient {
  return createClient<paths>({
    baseUrl,
    headers: {
      "api-key": apiKey,
    },
  });
}

export function normalizeEnvironment(
  environment: Environment | LegacyEnvironment
): Environment {
  if (environment === "production") {
    return "prod";
  }
  return environment;
}

export function extractErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Request failed";
  }

  const maybeError = error as {
    detail?: string;
    message?: string;
    error?: string;
  };

  return (
    maybeError.detail ??
    maybeError.message ??
    maybeError.error ??
    "Request failed"
  );
}

export function throwForBodyError(body: { error?: string | undefined }): void {
  if (body.error) {
    throw new Error(body.error);
  }
}

export function joinBaseUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(path.replace(/^\//, ""), normalizedBase).toString();
}
