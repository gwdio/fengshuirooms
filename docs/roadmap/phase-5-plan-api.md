# Phase 5 — Plan API + cloud save

Design: [architecture/backend.md](../architecture/backend.md#plan-api), [data-model.md](../architecture/data-model.md#backend-storage-v2).

- [ ] `services/plan-api` workspace: handler(s), shared validation from `packages/core`, esbuild bundle
- [ ] `data` module: DynamoDB table, on-demand, TTL, GSI
- [ ] `plan-api` module: Lambda + HTTP API + least-privilege IAM + 7-day log retention
- [ ] `POST/GET/PUT/DELETE /plans`, `GET /health`; size + schema validation
- [ ] Frontend cloud-save toggle and short-URL sharing (`/p/<slug>`)
- [ ] Read-only vs editable links
- [ ] Structured logging + error alarm
- [ ] ADR: access patterns and why

**Exit:** a plan saved on one device opens from a short link on another.
