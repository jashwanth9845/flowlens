import { decryptSecret, encryptSecret } from "./crypto";
import { getEnv, hasFigmaOAuth } from "./env";
import { extractFileKey, parseFigmaFile } from "../figma-parser";
import type { FigmaConnection } from "../types";
import { createId, nowIso, saveFigmaConnection } from "./store";

function figmaHeaders(connection: FigmaConnection): Record<string, string> {
  if (connection.mode === "pat" && connection.patTokenEncrypted) {
    return {
      "X-Figma-Token": decryptSecret(connection.patTokenEncrypted),
    };
  }

  if (connection.accessTokenEncrypted) {
    return {
      Authorization: `Bearer ${decryptSecret(connection.accessTokenEncrypted)}`,
    };
  }

  throw new Error("No usable Figma credentials found.");
}

export function getFigmaAuthorizeUrl(state: string) {
  if (!hasFigmaOAuth()) {
    return null;
  }

  const env = getEnv();
  const url = new URL("https://www.figma.com/oauth");
  url.searchParams.set("client_id", env.FIGMA_CLIENT_ID!);
  url.searchParams.set("redirect_uri", env.FIGMA_OAUTH_REDIRECT_URI!);
  url.searchParams.set("scope", "file_content:read current_user:read");
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  return url.toString();
}

export async function exchangeFigmaCode(code: string) {
  const env = getEnv();
  if (!hasFigmaOAuth()) {
    throw new Error("Figma OAuth is not configured.");
  }

  const basicAuth = Buffer.from(
    `${env.FIGMA_CLIENT_ID}:${env.FIGMA_CLIENT_SECRET}`,
    "utf8",
  ).toString("base64");

  const response = await fetch("https://api.figma.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      redirect_uri: env.FIGMA_OAUTH_REDIRECT_URI!,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(`Figma OAuth exchange failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user_id_string: string;
  };

  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
    figmaUserId: data.user_id_string,
  };
}

export async function refreshFigmaToken(connection: FigmaConnection) {
  if (connection.mode !== "oauth" || !connection.refreshTokenEncrypted) {
    return connection;
  }

  const env = getEnv();
  if (!hasFigmaOAuth()) {
    return connection;
  }

  const basicAuth = Buffer.from(
    `${env.FIGMA_CLIENT_ID}:${env.FIGMA_CLIENT_SECRET}`,
    "utf8",
  ).toString("base64");

  const response = await fetch("https://api.figma.com/v1/oauth/refresh", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      refresh_token: decryptSecret(connection.refreshTokenEncrypted),
    }),
  });

  if (!response.ok) {
    throw new Error(`Figma token refresh failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  const updated: FigmaConnection = {
    ...connection,
    accessTokenEncrypted: encryptSecret(data.access_token),
    tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    updatedAt: nowIso(),
  };

  await saveFigmaConnection(updated);
  return updated;
}

export async function ensureFreshFigmaConnection(connection: FigmaConnection) {
  if (
    connection.mode === "oauth" &&
    connection.tokenExpiresAt &&
    new Date(connection.tokenExpiresAt).getTime() < Date.now() + 60_000
  ) {
    return refreshFigmaToken(connection);
  }

  return connection;
}

export async function fetchFigmaFile(connection: FigmaConnection, fileKey: string) {
  const freshConnection = await ensureFreshFigmaConnection(connection);
  const response = await fetch(`https://api.figma.com/v1/files/${fileKey}?geometry=paths`, {
    headers: figmaHeaders(freshConnection),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Figma file fetch failed (${response.status}): ${message}`);
  }

  return response.json();
}

export async function fetchFigmaImages(
  connection: FigmaConnection,
  fileKey: string,
  nodeIds: string[],
) {
  const freshConnection = await ensureFreshFigmaConnection(connection);
  const url = new URL(`https://api.figma.com/v1/images/${fileKey}`);
  url.searchParams.set("ids", nodeIds.join(","));
  url.searchParams.set("format", "png");
  url.searchParams.set("scale", "2");

  const response = await fetch(url, {
    headers: figmaHeaders(freshConnection),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Figma images fetch failed (${response.status}): ${message}`);
  }

  const data = (await response.json()) as { images?: Record<string, string> };
  return data.images ?? {};
}

export async function loadFigmaParseResult(connection: FigmaConnection, fileUrl: string) {
  const fileKey = extractFileKey(fileUrl);
  if (!fileKey) {
    throw new Error("Please provide a valid Figma file URL.");
  }

  const fileData = await fetchFigmaFile(connection, fileKey);
  return parseFigmaFile(fileKey, fileData);
}

export async function createPatConnection(userId: string, token: string) {
  const connection: FigmaConnection = {
    id: createId("figma"),
    userId,
    mode: "pat",
    displayName: "Personal access token",
    scopes: ["file_content:read"],
    patTokenEncrypted: encryptSecret(token),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    lastSyncAt: null,
  };

  await saveFigmaConnection(connection);
  return connection;
}

export async function createOAuthConnection(args: {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}) {
  const connection: FigmaConnection = {
    id: createId("figma"),
    userId: args.userId,
    mode: "oauth",
    displayName: "Figma OAuth",
    scopes: ["file_content:read", "current_user:read"],
    accessTokenEncrypted: encryptSecret(args.accessToken),
    refreshTokenEncrypted: encryptSecret(args.refreshToken),
    tokenExpiresAt: args.expiresAt,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    lastSyncAt: null,
  };

  await saveFigmaConnection(connection);
  return connection;
}
