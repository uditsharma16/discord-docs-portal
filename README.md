# Discord Docs Portal

A private documentation portal backed by Google Docs. Members sign in with
Discord; the server verifies current guild membership and optional roles before
retrieving documents explicitly shared with a dedicated Google service account.

## What is built

- Discord OAuth and current server-membership verification
- Optional Discord-role allow-list
- Signed, short-lived, HTTP-only sessions
- Automatic discovery of Google Docs accessible to the service account
- Optional additional restriction to one Drive folder
- Google Docs headings, lists, tables, links, formatting, tabs, and images
- Server-side allow-list checks for every document and image request
- Searchable responsive archive
- Security headers, no indexing, no public Google links, and no stored OAuth tokens
- Cloudflare Worker deployment and automated TypeScript validation

## 1. Non-secret settings

Edit [`src/config.ts`](src/config.ts) for branding, support link, Discord role IDs,
session lifetime, and featured document IDs.

An empty `allowedRoleIds` list means every current member of the configured
Discord server can enter.

## 2. Discord application

1. Open the [Discord Developer Portal](https://discord.com/developers/applications).
2. Under **OAuth2**, add:
   - Local: `http://localhost:8787/auth/callback`
   - Production: `https://YOUR_WORKER_DOMAIN/auth/callback`
3. Copy the Client ID and Client Secret.
4. Copy the server ID after enabling Discord Developer Mode.

No bot installation is required. The application requests only `identify` and
`guilds.members.read`.

## 3. Google access

1. Enable the **Google Drive API** and **Google Docs API** in the service account's
   Google Cloud project.
2. Create/download a JSON key for the dedicated service account.
3. Keep each protected Google Doc set to **Restricted**.
4. Share each permitted document with the service-account email as **Viewer**.

The portal lists all Google Docs this service account can access. Therefore, use
this account only for portal documents. Removing Viewer permission removes a
document from the portal after the five-minute list cache expires.

To add a second folder boundary later, set `GOOGLE_DRIVE_FOLDER_ID`; otherwise
leave it unset.

## 4. Local development

```bash
npm install
cp .dev.vars.example .dev.vars
npm run typecheck
npm run dev
```

Fill `.dev.vars` first, then visit `http://localhost:8787`.

## 5. Cloudflare deployment

```bash
npm install
npx wrangler login
npx wrangler secret put DISCORD_CLIENT_ID
npx wrangler secret put DISCORD_CLIENT_SECRET
npx wrangler secret put DISCORD_GUILD_ID
npx wrangler secret put SESSION_SECRET
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
npx wrangler secret put GOOGLE_PRIVATE_KEY
npx wrangler secret put APP_ORIGIN
npm run deploy
```

Set `APP_ORIGIN` to the exact deployed origin without a trailing slash. Then add
`${APP_ORIGIN}/auth/callback` to Discord OAuth2 redirects.

## Required variables

| Variable | Secret | Purpose |
|---|---:|---|
| `APP_ORIGIN` | No | Exact deployed origin used in OAuth redirects |
| `DISCORD_CLIENT_ID` | No | Discord application identifier |
| `DISCORD_CLIENT_SECRET` | Yes | Discord OAuth credential |
| `DISCORD_GUILD_ID` | No | Discord server whose membership grants access |
| `SESSION_SECRET` | Yes | Session-signing key of at least 32 characters |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | No | Dedicated identity shared into documents |
| `GOOGLE_PRIVATE_KEY` | Yes | Service-account PKCS#8 private key |
| `GOOGLE_DRIVE_FOLDER_ID` | No | Optional additional folder restriction |

## Operational notes

- Accessible documents are cached for five minutes.
- Sessions default to one hour.
- Removing a member or role takes effect at the next sign-in/session expiry.
- Never commit `.dev.vars`, OAuth secrets, session secrets, or private keys.
