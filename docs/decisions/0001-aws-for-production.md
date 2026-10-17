# 0001. AWS (not Cloudflare) for production

- **Status**: Accepted
- **Date**: 2026-04
- **Revisit**: after 6 months in production

## Context

Cloudflare Pages + Workers + Durable Objects would run this app for $0 and has a nicer WebSocket
story. But a key goal of the project is demonstrating AWS + Terraform skills.

## Decision

Production runs on AWS from Phase 4 on.

**Amendment (2026-10-17):** no interim host. Phases 1–3 are local-only, and the first deploy is to AWS in
Phase 4. If an earlier public link turns out to be wanted, that's an owner decision
([open questions](open-questions.md)).

## Consequences

- An explicit migration phase, which is itself worth documenting
- Some cost and complexity the product alone wouldn't justify — keep it bounded by the cost controls in
  [infrastructure.md](../architecture/infrastructure.md#cost-controls)
