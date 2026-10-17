# 0004. URL-hash sharing in V1, backend in V2

- **Status**: Accepted
- **Date**: 2026-04
- **Revisit**: after Phase 1 ships

## Context

Sharing matters (roommates, partners), but a backend just for sharing would pull Phase 4–5 work into V1.

## Decision

V1 encodes the plan in the URL hash (gzip + base64url). Hash fragments never hit a server, so this is
private by default. Practical ceiling ~30 KB of encoded data.

## Consequences

- Background images can't be shared this way (too large) — share links drop them with a notice
- Shared links are snapshots, not live. V2 adds short URLs and live collab.
- The encoding must include `schemaVersion` so old links survive migrations
