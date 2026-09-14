/**
 * ================================================================
 * EDIT THIS SECTION — no secrets belong in this file.
 * ================================================================
 */
export const PORTAL_CONFIG = {
  brandName: "Holocron Network",
  eyebrow: "Private knowledge archive",
  description: "Doctrine, records and field knowledge for verified server members.",
  accentColor: "#8b5cf6",
  supportUrl: "https://discord.com/channels/YOUR_SERVER_ID/YOUR_SUPPORT_CHANNEL_ID",

  /**
   * Leave empty to allow every current member of the Discord server.
   * Add Discord role IDs to require at least one of the listed roles.
   * Example: ["123456789012345678", "987654321098765432"]
   */
  allowedRoleIds: [] as string[],

  /**
   * Optional labels for role IDs. These are cosmetic and never grant access.
   */
  roleLabels: {} as Record<string, string>,

  /**
   * Session lifetime. Short sessions make removals/bans take effect sooner.
   */
  sessionHours: 1,

  /**
   * Optional featured files, shown first when present in the configured
   * Google Drive folder. IDs not in that folder are rejected.
   */
  featuredDocumentIds: [] as string[],
} as const;

/**
 * Runtime secrets and deployment-specific values.
 * Add these with Cloudflare secrets/variables; never commit their values.
 */
export interface Env {
  APP_ORIGIN: string;
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  DISCORD_GUILD_ID: string;
  SESSION_SECRET: string;
  GOOGLE_SERVICE_ACCOUNT_EMAIL: string;
  GOOGLE_PRIVATE_KEY: string;
  /** Optional extra restriction. Leave unset to show every Doc shared with the service account. */\n  GOOGLE_DRIVE_FOLDER_ID?: string;
}
