import { PORTAL_CONFIG, type Env } from "./config";
import type { DiscordMember, DiscordUser, SessionUser } from "./types";

const API = "https://discord.com/api/v10";

export function discordLoginUrl(env: Env, state: string): string {
  const query = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    redirect_uri: `${env.APP_ORIGIN}/auth/callback`,
    response_type: "code",
    scope: "identify guilds.members.read",
    state,
  });
  return `${API}/oauth2/authorize?${query}`;
}

async function discordRequest<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Discord request failed (${response.status})`);
  }
  return response.json<T>();
}

export async function exchangeDiscordCode(env: Env, code: string): Promise<string> {
  const body = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    client_secret: env.DISCORD_CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: `${env.APP_ORIGIN}/auth/callback`,
  });
  const response = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error(`Discord token exchange failed (${response.status})`);
  const token = await response.json<{ access_token?: string }>();
  if (!token.access_token) throw new Error("Discord returned no access token");
  return token.access_token;
}

export async function authorizeDiscordMember(env: Env, accessToken: string): Promise<SessionUser> {
  const [user, member] = await Promise.all([
    discordRequest<DiscordUser>("/users/@me", accessToken),
    discordRequest<DiscordMember>(`/users/@me/guilds/${env.DISCORD_GUILD_ID}/member`, accessToken),
  ]);

  const requiredRoles = PORTAL_CONFIG.allowedRoleIds;
  if (requiredRoles.length > 0 && !member.roles.some((role) => requiredRoles.includes(role))) {
    throw new Error("MISSING_ROLE");
  }

  return {
    id: user.id,
    username: user.username,
    globalName: user.global_name ?? undefined,
    avatar: user.avatar ?? undefined,
    roles: member.roles,
    exp: Date.now() + PORTAL_CONFIG.sessionHours * 60 * 60 * 1000,
  };
}
