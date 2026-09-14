import { PORTAL_CONFIG, type Env } from "./config";
import { authorizeDiscordMember, discordLoginUrl, exchangeDiscordCode } from "./discord";
import { fetchDocumentImage, getDocument, listDocuments } from "./google";
import { renderGoogleDocument } from "./render";
import {
  clearCookie,
  cookie,
  parseCookies,
  randomToken,
  readSession,
  signValue,
  verifyValue,
} from "./security";
import { documentPage, errorPage, loginPage, portalPage } from "./ui";

interface OAuthState {
  nonce: string;
  exp: number;
}

const requiredEnvironment: Array<keyof Env> = [
  "APP_ORIGIN",
  "DISCORD_CLIENT_ID",
  "DISCORD_CLIENT_SECRET",
  "DISCORD_GUILD_ID",
  "SESSION_SECRET",
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_PRIVATE_KEY",
  "GOOGLE_DRIVE_FOLDER_ID",
];

function validateEnvironment(env: Env): void {
  const missing = requiredEnvironment.filter((key) => !env[key] || env[key].includes("YOUR_"));
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  if (env.SESSION_SECRET.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters");
  }
}

function html(markup: string, status = 200): Response {
  return new Response(markup, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function redirect(location: string, headers?: Headers): Response {
  const responseHeaders = headers ?? new Headers();
  responseHeaders.set("Location", location);
  return new Response(null, { status: 302, headers: responseHeaders });
}

function secure(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store");
  headers.set(
    "Content-Security-Policy",
    "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  );
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function callbackFailure(reason: "auth" | "membership"): Response {
  return redirect(`/?error=${reason}`, new Headers({ "Set-Cookie": clearCookie("holocron_oauth") }));
}

async function handleLogin(env: Env): Promise<Response> {
  validateEnvironment(env);
  const state = await signValue<OAuthState>(
    { nonce: randomToken(), exp: Date.now() + 10 * 60 * 1000 },
    env.SESSION_SECRET,
  );
  const headers = new Headers({ "Set-Cookie": cookie("holocron_oauth", state, 600) });
  return redirect(discordLoginUrl(env, state), headers);
}

async function handleCallback(request: Request, env: Env): Promise<Response> {
  validateEnvironment(env);
  const url = new URL(request.url);
  if (url.searchParams.has("error")) return callbackFailure("auth");

  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const cookieState = parseCookies(request).holocron_oauth;
  if (!code || !returnedState || returnedState !== cookieState) return callbackFailure("auth");

  const state = await verifyValue<OAuthState>(returnedState, env.SESSION_SECRET);
  if (!state || state.exp <= Date.now()) return callbackFailure("auth");

  try {
    const accessToken = await exchangeDiscordCode(env, code);
    const user = await authorizeDiscordMember(env, accessToken);
    const session = await signValue(user, env.SESSION_SECRET);
    const headers = new Headers();
    headers.append("Set-Cookie", cookie("holocron_session", session, PORTAL_CONFIG.sessionHours * 3600));
    headers.append("Set-Cookie", clearCookie("holocron_oauth"));
    return redirect("/", headers);
  } catch (error) {
    const reason = error instanceof Error &&
      (error.message === "MISSING_ROLE" || error.message.includes("Discord request failed (404)"))
      ? "membership"
      : "auth";
    return callbackFailure(reason);
  }
}

async function handleHome(request: Request, env: Env): Promise<Response> {
  const reason = new URL(request.url).searchParams.get("error");
  const user = await readSession(request, env.SESSION_SECRET);
  if (!user) return html(loginPage(reason === "membership" ? "membership" : reason === "auth" ? "auth" : undefined));

  try {
    return html(portalPage(user, await listDocuments(env)));
  } catch (error) {
    return errorPage(
      "Archive unavailable",
      error instanceof Error ? error.message : "The document archive could not be loaded.",
      503,
    );
  }
}

async function handleDocument(request: Request, env: Env, documentId: string): Promise<Response> {
  const user = await readSession(request, env.SESSION_SECRET);
  if (!user) return redirect("/");
  try {
    const [document, files] = await Promise.all([getDocument(env, documentId), listDocuments(env)]);
    const file = files.find((item) => item.id === documentId);
    if (!file) return errorPage("Document not found", "This record is not part of the permitted archive.", 404);
    return html(documentPage(user, file, renderGoogleDocument(document, documentId)));
  } catch (error) {
    if (error instanceof Error && error.message === "DOCUMENT_NOT_ALLOWED") {
      return errorPage("Document not found", "This record is not part of the permitted archive.", 404);
    }
    return errorPage("Document unavailable", "The record could not be retrieved from Google Drive.", 502);
  }
}

async function handleImage(
  request: Request,
  env: Env,
  documentId: string,
  objectId: string,
): Promise<Response> {
  if (!(await readSession(request, env.SESSION_SECRET))) return new Response("Unauthorized", { status: 401 });
  try {
    return fetchDocumentImage(env, documentId, objectId);
  } catch {
    return new Response("Image unavailable", { status: 502 });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/api/health") {
        return secure(Response.json({ ok: true, service: "discord-docs-portal" }));
      }

      validateEnvironment(env);

      if (request.method === "GET" && url.pathname === "/login") {
        return secure(await handleLogin(env));
      }
      if (request.method === "GET" && url.pathname === "/auth/callback") {
        return secure(await handleCallback(request, env));
      }
      if (request.method === "POST" && url.pathname === "/logout") {
        return secure(redirect("/", new Headers({ "Set-Cookie": clearCookie("holocron_session") })));
      }
      if (request.method === "GET" && url.pathname === "/") {
        return secure(await handleHome(request, env));
      }

      const documentMatch = url.pathname.match(/^\/docs\/([^/]+)$/);
      if (request.method === "GET" && documentMatch) {
        return secure(await handleDocument(request, env, decodeURIComponent(documentMatch[1])));
      }
      const imageMatch = url.pathname.match(/^\/api\/image\/([^/]+)\/([^/]+)$/);
      if (request.method === "GET" && imageMatch) {
        return secure(await handleImage(
          request,
          env,
          decodeURIComponent(imageMatch[1]),
          decodeURIComponent(imageMatch[2]),
        ));
      }
      return secure(errorPage("Page not found", "This path does not exist in the archive.", 404));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected server error";
      return secure(errorPage("Portal not configured", message, 503));
    }
  },
} satisfies ExportedHandler<Env>;
