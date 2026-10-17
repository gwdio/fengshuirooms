# Phase 6 — Real-time collab

Design: [architecture/backend.md](../architecture/backend.md#realtime-api).

- [ ] `services/realtime` workspace: `$connect`, `$disconnect`, `message` handlers
- [ ] `realtime-api` module: WebSocket API + Lambda + IAM (`execute-api:ManageConnections`)
- [ ] Connection records with TTL; `GoneException` cleanup
- [ ] `join` → snapshot; `edit` → validate, persist, broadcast; LWW per item id
- [ ] Cursor presence
- [ ] Frontend: WS client with reconnect, optimistic updates, presence cursors
- [ ] Measure cold-start / message latency; write up findings

**Exit:** two browsers edit the same plan live; reconnecting catches up correctly.
