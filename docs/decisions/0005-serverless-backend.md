# 0005. Lambda + DynamoDB + API Gateway WebSockets for the backend

- **Status**: Accepted
- **Date**: 2026-04
- **Revisit**: if WebSocket connection-minute pricing dominates the bill

## Context

Workload is spiky and tiny: mostly idle, occasional bursts of a few users. Need REST + WebSockets on AWS.

## Decision

Lambda for compute, DynamoDB on-demand for storage, API Gateway HTTP API + WebSocket API.

## Alternatives

| Stack                                        | Idle cost | Pros                           | Cons                               | Verdict                                                 |
| -------------------------------------------- | --------- | ------------------------------ | ---------------------------------- | ------------------------------------------------------- |
| Cloudflare Pages + Workers + Durable Objects | $0        | Free, fast, great WS via DO    | Less AWS signal                    | Strong, parked (see [0001](0001-aws-for-production.md)) |
| Fly.io with auto-stop machines               | $0–5      | Real containers, scale-to-zero | Smaller hiring footprint           | Considered, not chosen                                  |
| Fargate + ALB scale-to-zero                  | ~$22+     | Container experience           | ALB always on; 30–90 s cold starts | Rejected: wrong primitive                               |
| Fargate always-on, small                     | ~$10–15   | Simple                         | Pays for idle                      | Rejected at this scale                                  |
| **Lambda + DynamoDB + API GW WS**            | $0–5      | Scales to zero, cheap          | Cold start on first message        | **Chosen**                                              |

## Consequences

- Stateless handlers: room membership lives in DynamoDB, not memory
- Cold starts are visible on first collab message — measure and write it up rather than paying for
  provisioned concurrency up front
