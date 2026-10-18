# Data model

## Plan document (client-side)

A plan is a **document of entity collections** keyed by id, not a nested tree
([ADR-0011](../decisions/0011-plan-as-entity-document.md)). Generic machinery lives in
[`packages/core/src/doc/`](../../packages/core/src/doc/), and entity types in
[`packages/core/src/model/entities.ts`](../../packages/core/src/model/entities.ts). The code wins if it
and this doc disagree.

| Collection    | Entity      | Status                                               |
| ------------- | ----------- | ---------------------------------------------------- |
| `meta`        | `PlanMeta`  | Live. A single entity `plan`: name, units, createdAt |
| `walls`       | `Wall`      | Live. Straight segments                              |
| `features`    | WallFeature | Planned: doors/windows, referencing `wallId`         |
| `layouts`     | Layout      | Planned: named furniture arrangements                |
| `items`       | PlacedItem  | Planned: furniture, referencing `layoutId`           |
| `clearances`  | Clearance   | Planned: referencing `itemId`                        |
| `annotations` | Annotation  | Planned                                              |

Changes are batches of `{ collection, id, value | null }` with an origin (`local`, `load`, `remote`,
`undo`). Per-browser state (selection, tool, grid snap) is not in the document.

### Invariants

- **All lengths are inches** ([ADR-0008](../decisions/0008-canonical-unit-inches.md)). `units` is display only.
- **Coordinates**: +x right, +y down (canvas convention). `PlacedItem.position` is the item's center.
  `rotation` is degrees clockwise.
- **Walls** are straight segments, never curved. Connected walls share exact endpoint coordinates
  (the pen snaps to existing endpoints and rounds to 1"), so "same corner" means equal `x`/`y`.
  Local edits are normalized before commit: no endpoint lies strictly inside another wall (it gets
  split there), and no two inline walls meet at an otherwise bare corner (they get merged). There is
  no separate corner/vertex entity ([ADR-0010](../decisions/0010-walls-as-segments.md)).
- **IDs** are `crypto.randomUUID()` strings. Entities refer to each other by id, and **a reference may
  dangle** (a peer deleted the target). Readers must cope.
- **Unchanged entities keep their object identity** through edits. Change detection diffs by reference,
  so a function that copies untouched entities would report them all as changed.
- **Versioning is per collection.** Changing an entity's stored shape means bumping that
  `CollectionSpec.version` and adding a `migrations[oldVersion]` step. Never edit an existing step.

## Stored form (browser)

`writeSnapshot`/`readSnapshot` in core:

```json
{ "format": 1, "collections": { "walls": { "version": 1, "entities": [ ... ] }, "meta": { ... } } }
```

Reading drops invalid entities individually, keeps unknown or newer collections verbatim (and writes
them back), and throws only if the data isn't a snapshot at all. localStorage keys are documented in
[`apps/web/src/persistence/docStorage.ts`](../../apps/web/src/persistence/docStorage.ts).

## Catalog (static, bundled)

Source: [`packages/core/src/catalog/types.ts`](../../packages/core/src/catalog/types.ts).
`Catalog → categories[] + items[]`. A category sets `defaultLayer` and `defaultTall`; an item carries
default dimensions, `frontFace`, and `autoClearances` templates. A `PlacedItem` copies what it needs at
drop time and keeps `catalogId` as a reference — editing the catalog never mutates saved plans.

## Backend storage (V2)

> Written before ADR-0011. The `DATA` blob would hold a snapshot as above, and realtime edits are
> change batches. Revisit the key design in Phase 5.

Single DynamoDB table, single-table design:

| PK              | SK              | Attributes                           |
| --------------- | --------------- | ------------------------------------ |
| `PLAN#<planId>` | `META`          | name, ownerId?, createdAt, updatedAt |
| `PLAN#<planId>` | `DATA`          | gzipped Plan blob                    |
| `PLAN#<planId>` | `CONN#<connId>` | connectionId, joinedAt, ttl          |
| `USER#<userId>` | `PLAN#<planId>` | lookup for "my plans" (V3)           |

- GSI on `connectionId` → plan, so `$disconnect` can find the room
- TTL on `CONN#` items (30 min idle)
- Access is always `GetItem` / `Query` on PK — never `Scan`
- DynamoDB items cap at 400 KB; gzipped plans should be far under, but the API enforces a size limit.
  Background images are **not** stored in the blob (see [open questions](../decisions/open-questions.md)).
