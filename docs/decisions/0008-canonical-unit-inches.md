# 0008. Store all lengths in inches

- **Status**: Accepted
- **Date**: 2026-10-17
- **Revisit**: No (changing this later means a schema migration)

## Context

The original data model had a per-plan `units` field but didn't say what unit stored numbers are in.
Storing in the user's chosen unit would make every geometry function unit-aware and make toggling
units a lossy rewrite of the whole plan.

## Decision

Every stored length is in inches (floating point). `Plan.units` only affects display and input
parsing. Conversion lives in `packages/core/src/units`.

## Alternatives

- Millimeters as integers — avoids float drift, but the catalog is authored in US inches and the
  primary user is imperial. Float inches are precise enough for furniture.

## Consequences

Metric input like "200 cm" is converted on entry; metric display may show values like 152 cm for a
60" item. That's expected.
