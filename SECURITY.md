# Security model

The portal grants access only after Discord OAuth confirms that the visitor is a
current member of the configured server and, when configured, holds an allowed
role.

## Boundaries

- Google Docs remain **Restricted**, never “Anyone with the link”.
- The dedicated service account receives Viewer access only to portal documents.
- A requested document ID must appear in the service account's accessible document
  list before content is retrieved.
- An optional `GOOGLE_DRIVE_FOLDER_ID` can add a second folder boundary.
- Discord access tokens are used during sign-in and never stored.
- Browser sessions contain signed identity/role data and expire quickly.
- Google images pass through an authenticated proxy.
- Document text is HTML-escaped before rendering.
- Responses disable framing, indexing, referrers, caching, and unnecessary browser
  permissions.

## Known limitation

An authorized reader can still copy, photograph, or screenshot content. No web
portal can prevent deliberate redistribution by an authorized reader.

## Secret handling

Never commit `.dev.vars`, service-account JSON, OAuth secrets, private keys, or
session keys. Use Cloudflare secret storage and rotate any accidentally exposed
value.
