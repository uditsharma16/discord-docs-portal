import type { Env } from "./config";
import type { DriveFile, GoogleDoc, GoogleTab, InlineObject } from "./types";

const encoder = new TextEncoder();
let cachedToken: { token: string; expiresAt: number } | null = null;
let cachedFiles: { sourceKey: string; files: DriveFile[]; expiresAt: number } | null = null;

function base64Url(input: string | ArrayBuffer): string {
  const bytes = typeof input === "string" ? encoder.encode(input) : new Uint8Array(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemBytes(pem: string): ArrayBuffer {
  const normalized = pem.replace(/\\n/g, "\n");
  const base64 = normalized
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function googleAccessToken(env: Env): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(JSON.stringify({
    iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claim}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemBytes(env.GOOGLE_PRIVATE_KEY),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(unsigned));
  const assertion = `${unsigned}.${base64Url(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) {
    const failure = await response.json<{ error?: string; error_description?: string }>().catch(() => ({ error: undefined, error_description: undefined }));
    const detail = [failure.error, failure.error_description].filter(Boolean).join(": ");
    throw new Error(`Google authentication failed (${response.status})${detail ? `: ${detail}` : ""}`);
  }
  const result = await response.json<{ access_token?: string; expires_in?: number }>();
  if (!result.access_token) throw new Error("Google returned no access token");
  cachedToken = {
    token: result.access_token,
    expiresAt: Date.now() + (result.expires_in ?? 3600) * 1000,
  };
  return cachedToken.token;
}

async function googleJson<T>(env: Env, url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${await googleAccessToken(env)}` },
  });
  if (!response.ok) {
    const failure = await response.json<{
      error?: { status?: string; message?: string } | string;
      error_description?: string;
    }>().catch(() => ({ error: undefined, error_description: undefined }));
    const apiError = typeof failure.error === "string"
      ? failure.error
      : [failure.error?.status, failure.error?.message].filter(Boolean).join(": ");
    const detail = apiError || failure.error_description || "";
    throw new Error(`Google API request failed (${response.status})${detail ? `: ${detail}` : ""}`);
  }
  return response.json<T>();
}

export async function listDocuments(env: Env): Promise<DriveFile[]> {
  const folderId = env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  const sourceKey = folderId || "all-service-account-documents";
  if (
    cachedFiles &&
    cachedFiles.sourceKey === sourceKey &&
    cachedFiles.expiresAt > Date.now()
  ) return cachedFiles.files;

  const documentQuery = folderId
    ? `'${folderId}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.document'`
    : "trashed = false and mimeType = 'application/vnd.google-apps.document'";

  const files: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const query = new URLSearchParams({
      q: documentQuery,
      fields: "nextPageToken,files(id,name,mimeType,modifiedTime,description)",
      pageSize: "1000",
      orderBy: "name",
      includeItemsFromAllDrives: "true",
      supportsAllDrives: "true",
    });
    if (pageToken) query.set("pageToken", pageToken);
    const page = await googleJson<{ files?: DriveFile[]; nextPageToken?: string }>(
      env,
      `https://www.googleapis.com/drive/v3/files?${query}`,
    );
    files.push(...(page.files ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);

  cachedFiles = { sourceKey, files, expiresAt: Date.now() + 300_000 };
  return files;
}

export async function assertAllowedDocument(env: Env, documentId: string): Promise<DriveFile> {
  const file = (await listDocuments(env)).find((item) => item.id === documentId);
  if (!file) throw new Error("DOCUMENT_NOT_ALLOWED");
  return file;
}

export async function exportDocumentPdf(env: Env, documentId: string): Promise<Response> {
  const file = await assertAllowedDocument(env, documentId);
  const query = new URLSearchParams({ mimeType: "application/pdf" });
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(documentId)}/export?${query}`,
    { headers: { Authorization: `Bearer ${await googleAccessToken(env)}` } },
  );
  if (!response.ok) {
    const failure = await response.json<{
      error?: { status?: string; message?: string } | string;
    }>().catch(() => ({ error: undefined, error_description: undefined }));
    const detail = typeof failure.error === "string"
      ? failure.error
      : [failure.error?.status, failure.error?.message].filter(Boolean).join(": ");
    throw new Error(`Google PDF export failed (${response.status})${detail ? `: ${detail}` : ""}`);
  }

  const filename = `${file.name.replace(/[\\"\r\n]/g, "_")}.pdf`;
  const headers = new Headers({
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  const length = response.headers.get("Content-Length");
  if (length) headers.set("Content-Length", length);
  return new Response(response.body, { status: 200, headers });
}

export async function getDocument(env: Env, documentId: string): Promise<GoogleDoc> {
  await assertAllowedDocument(env, documentId);
  return googleJson<GoogleDoc>(
    env,
    `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}?includeTabsContent=true`,
  );
}

function allTabs(tabs: GoogleTab[] = []): GoogleTab[] {
  return tabs.flatMap((tab) => [tab, ...allTabs(tab.childTabs)]);
}

export function findInlineObject(document: GoogleDoc, objectId: string): InlineObject | undefined {
  if (document.inlineObjects?.[objectId]) return document.inlineObjects[objectId];
  for (const tab of allTabs(document.tabs)) {
    const object = tab.documentTab?.inlineObjects?.[objectId];
    if (object) return object;
  }
  return undefined;
}

export async function fetchDocumentImage(
  env: Env,
  documentId: string,
  objectId: string,
): Promise<Response> {
  const document = await getDocument(env, documentId);
  const uri = findInlineObject(document, objectId)?.inlineObjectProperties?.embeddedObject
    ?.imageProperties?.contentUri;
  if (!uri) return new Response("Image not found", { status: 404 });

  const upstream = await fetch(uri);
  if (!upstream.ok || !upstream.body) return new Response("Image unavailable", { status: 502 });
  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/png",
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
