# Backend (V2+)

Nothing here exists yet. Built in [Phase 5](../roadmap/phase-5-plan-api.md) and
[Phase 6](../roadmap/phase-6-realtime.md).

## Scope

The backend exists only for: cloud save / cross-device access, short share URLs, real-time collab,
and (maybe) auth. Everything else stays client-side.

## Plan API

| Method   | Path         | Behavior                           |
| -------- | ------------ | ---------------------------------- |
| `POST`   | `/plans`     | Create; returns slug               |
| `GET`    | `/plans/:id` | Fetch (anonymous or authenticated) |
| `PUT`    | `/plans/:id` | Update (auth check if owned)       |
| `DELETE` | `/plans/:id` | Delete                             |
| `GET`    | `/health`    | Liveness                           |

Lambda behind API Gateway **HTTP API** (preferred over function URLs for routing/auth integration;
revisit if it's overkill). Validate bodies against the core schema; reject oversize payloads.

## Realtime API

API Gateway WebSocket API with Lambda handlers for `$connect`, `$disconnect`, and `message`.

| Route    | Payload                  | Server action                                            |
| -------- | ------------------------ | -------------------------------------------------------- |
| `join`   | `{ planId }`             | Store `CONN#` item; reply with current plan snapshot     |
| `edit`   | `{ planId, patch }`      | Validate, apply, persist, broadcast to other connections |
| `cursor` | `{ planId, x, y, name }` | Broadcast only (not persisted)                           |
| `leave`  | `{ planId }`             | Delete `CONN#` item                                      |

### Edit flow

```
Client A ──edit──▶ API GW WS ──▶ Lambda ──write patch──▶ DynamoDB
                                   │ ◀──query CONN#─────┘
                                   └──postToConnection──▶ API GW WS ──▶ Client B
Client A ◀──ack──────────────────────────┘
```

## Data integrity

> Since ADR-0011 the client already speaks the sync vocabulary: an `edit` payload is a change batch
> (`{ collection, id, value | null }[]`). The server validates each entity with the same
> `CollectionSpec.parse` and applies last-write-wins per entity.

- DynamoDB is the source of truth
- Patches validated server-side (size, schema)
- Conflict resolution: last-write-wins per `PlacedItem.id` (CRDT is overkill for 2–3 people;
  see [open questions](../decisions/open-questions.md))
- Periodic full snapshot so reconnects / late joiners get consistent state
- Stale connections (`GoneException` on post) are deleted on the spot

## Auth (V3, optional)

Cognito user pools, JWT verification in Lambda. Anonymous-first: `ownerId` may be null forever.
