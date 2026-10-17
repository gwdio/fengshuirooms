# Furniture catalog

## Approach

Hand-curated, typed, in-repo: [`packages/core/src/catalog/catalog.ts`](../../packages/core/src/catalog/catalog.ts).
Bundled into the app at build time ([open question](../decisions/open-questions.md) on moving to a CDN past ~200 items).

- Phase 1: ~30 common items. Phase 2: ~80–100 items.
- Sizes are real-world US standards **in inches**; metric is computed at display time.
- `validateCatalog` runs in the test suite — CI fails on duplicate ids, unknown categories, or
  non-positive dimensions.

Categories: beds, seating, tables, desks, storage, kitchen, bathroom, soft goods, tech, decor,
plants, workout, hobby, pet, fixed (doors/windows/outlets).

## Authoring rules

- `id` is kebab-case and stable forever (saved plans reference it)
- `defaultW` = side-to-side width when facing "south" (toward the viewer); `defaultH` = depth
- Set `tall: true` if it would block a seated person's line of sight (~4 ft+)
- Give drawer/door-fronted items a `frontFace` and an `autoClearances` entry
- No brand names, no scraped data ([ADR-0003](../decisions/0003-no-catalog-scraping.md))

## Later: community packs (V3+)

Submit via form → stored in DynamoDB separately from the official catalog → manual review → tagged
with submitter. Not planned in detail.
