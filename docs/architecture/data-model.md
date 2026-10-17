# Data model

## Plan (client-side, serialized)

Source of truth: [`packages/core/src/model/plan.ts`](../../packages/core/src/model/plan.ts). This doc
explains intent; the code wins if they disagree.

```
Plan
├── schemaVersion, id, name, units, createdAt, updatedAt
├── rooms[]            usually 1 in V1
│   ├── walls[]        ordered, closed polygon
│   ├── features[]     doors/windows, positioned 0–1 along a wall
│   └── fixedItems[]   outlets, vents, radiators, closets
├── layouts[]          alternative furniture arrangements of the same room(s)
│   ├── items[]        PlacedItem: shape, center position, w/h, rotation, layer, tall
│   └── clearances[]   attached to an item; auto or user-drawn
├── activeLayoutId
├── annotations[]      sticky notes
└── background?        traced floorplan image + scale calibration
```

### Invariants

- **All lengths are inches** ([ADR-0008](../decisions/0008-canonical-unit-inches.md)). `units` is display only.
- **Coordinates**: +x right, +y down (canvas convention). `PlacedItem.position` is the item's center.
  `rotation` is degrees clockwise.
- **IDs** are `crypto.randomUUID()` strings, never array indices — collab merges by id.
- **Versioning**: any change to a persisted shape bumps `SCHEMA_VERSION` and adds a migration
  `vN → vN+1` in `packages/core`. Plans in localStorage and old share links must keep loading.
- Rooms and layouts are deliberately separate: walls are shared across layouts; furniture is per layout.

## Catalog (static, bundled)

Source: [`packages/core/src/catalog/types.ts`](../../packages/core/src/catalog/types.ts).
`Catalog → categories[] + items[]`. A category sets `defaultLayer` and `defaultTall`; an item carries
default dimensions, `frontFace`, and `autoClearances` templates. A `PlacedItem` copies what it needs at
drop time and keeps `catalogId` as a reference — editing the catalog never mutates saved plans.

## Backend storage (V2)

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
