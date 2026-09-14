# Security model

The portal grants access only after Discord OAuth confirms that the visitor is a
current member of the configured server and, when configured, holds an allowed
role.

## Boundaries

- Google Docs must be **Restricted**, not “Anyone with the link”.
- The service account receives Viewer access only to the dedicated source folder.
- A requested document ID is checked against the configured folder before it is
  retrieved.
- Discord access tokens are used only during sign-in and are never stored.
- Browser sessions contain only signed identity/role data and expire after the
  configured short lifetime.
- Google images are proxied through an authenticated route.
- All document text is HTML-escaped before rendering.
- Responses disable framing, indexing, referrers, caching, and unnecessary browser
  permissions.

## Known limitation

An authorized reader can still copy, photograph, or screenshot content. No web
portal can technically prevent deliberate redistribution by an authorized person.

## Secret handling

Never commit `.dev.vars`, service-account JSON, OAuth secrets, private keys, or
session keys. Use Cloudflare secret storage in production and rotate any value that
is accidentally exposed.
