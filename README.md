# Discord Docs Portal

A private documentation portal backed by Google Docs. Members sign in with
Discord; the server verifies current guild membership and optional Discord roles
before retrieving documents from a restricted Google Drive folder.

## What is already built

- Discord OAuth login
- Current server-membership verification
- Optional Discord-role allow-list
- Signed, short-lived, HTTP-only sessions
- Automatic listing of Google Docs in one Drive folder
- Google Docs text, headings, lists, tables, links, formatting, and images
- Server-side allow-list check for every document and image request
- Searchable responsive archive
- Security headers, no indexing, no public Google links, and no stored access tokens
- Cloudflare Worker deployment configuration

## 1. Edit the non-secret settings

Open [`src/config.ts`](src/config.ts). The first section contains the branding,
support link, allowed Discord role IDs, session lifetime, and featured documents.

An empty `allowedRoleIds` list means every current member of your Discord server
can enter.

## 2. Create the Discord application

1. Open the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create an application.
3. Under **OAuth2**, add:
   - Local: `http://localhost:8787/auth/callback`
   - Production: `https://YOUR_WORKER_DOMAIN/auth/callback`
4. Copy the Client ID and Client Secret.
5. Copy the Discord server ID (enable Developer Mode, then right-click the server).

No Discord bot needs to be installed. The OAuth scopes used are `identify` and
`guilds.members.read`.

## 3. Prepare Google Drive

1. Create a dedicated Drive folder for portal documents.
2. Move or shortcut the permitted Google Docs into that folder.
3. Set every document and the folder to **Restricted**.
4. In [Google Cloud Console](https://console.cloud.google.com/):
   - create/select a project;
   - enable **Google Drive API** and **Google Docs API**;
   - create a service account and JSON key.
5. Share the folder as **Viewer** with the service account email.
6. Copy the folder ID from its URL.

Use a dedicated folder: the portal intentionally refuses IDs that are not direct
children of the configured folder.

## 4. Configure locally

```bash
npm install
cp .dev.vars.example .dev.vars
```

Fill `.dev.vars`, then run:

```bash
npm run typecheck
npm run dev
```

Visit `http://localhost:8787`.

## 5. Deploy to Cloudflare

Create a free Cloudflare account, install dependencies, and authenticate Wrangler:

```bash
npm install
npx wrangler login
```

Set each secret:

```bash
npx wrangler secret put DISCORD_CLIENT_ID
npx wrangler secret put DISCORD_CLIENT_SECRET
npx wrangler secret put DISCORD_GUILD_ID
npx wrangler secret put SESSION_SECRET
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
npx wrangler secret put GOOGLE_PRIVATE_KEY
npx wrangler secret put GOOGLE_DRIVE_FOLDER_ID
npx wrangler secret put APP_ORIGIN
```

For `APP_ORIGIN`, enter the final origin without a trailing slash, such as
`https://discord-docs-portal.YOUR_SUBDOMAIN.workers.dev`.

Deploy:

```bash
npm run deploy
```

After the first deployment, confirm its URL, set `APP_ORIGIN` to that exact
origin, and ensure the same callback URL exists in Discord OAuth settings.

## Environment variables

| Variable | Secret | Purpose |
|---|---:|---|
| `APP_ORIGIN` | No | Exact deployed origin used in OAuth redirects |
| `DISCORD_CLIENT_ID` | No | Discord application identifier |
| `DISCORD_CLIENT_SECRET` | Yes | Discord OAuth credential |
| `DISCORD_GUILD_ID` | No | Server whose membership grants access |
| `SESSION_SECRET` | Yes | Signs browser sessions; minimum 32 characters |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | No | Identity shared into the Drive folder |
| `GOOGLE_PRIVATE_KEY` | Yes | Service-account PKCS#8 private key |
| `GOOGLE_DRIVE_FOLDER_ID` | No | Only this folder's Docs are exposed |

## Operational notes

- Folder results are cached in a Worker isolate for five minutes.
- Sessions default to one hour; edit `sessionHours` in `src/config.ts`.
- Removing a member or role takes effect at their next sign-in/session expiry.
- Nested Drive subfolders are not traversed.
- Never put real secrets in GitHub, `wrangler.jsonc`, or `src/config.ts`.
