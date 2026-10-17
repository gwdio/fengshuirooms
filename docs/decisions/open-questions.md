# Open questions

Each has a current lean. If you're working on the phase that forces the question, either go with the
lean and write an ADR, or — if the lean looks wrong — stop and ask.

| Question                                                  | Lean                                                                      | Forced by        |
| --------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------- |
| Visibility: coarse grid vs visibility polygon?            | Grid; polygon only if perf/looks demand                                   | Phase 3          |
| Collab conflict resolution: CRDT vs LWW?                  | LWW per item id; revisit if conflicts are noticeable                      | Phase 6          |
| Auth: Cognito vs custom vs none?                          | None until cloud save proves accounts are wanted; then Cognito            | Phase 7          |
| Catalog: bundle vs fetch from CDN?                        | Bundle until ~200 items                                                   | Phase 2+         |
| Deploy anything before Phase 4 (e.g. a free static host)? | No; local only until the owner asks                                       | Owner            |
| Phase 4: single environment or dev + prod?                | Single prod environment until a second is actually needed                 | Phase 4          |
| Undo: full snapshots vs patches?                          | Snapshots (plans are small); patches if memory shows up in profiling      | Phase 1          |
| Where do background images live once cloud save exists?   | S3 object referenced by URL; never inside the DynamoDB blob or share hash | Phase 5          |
| Product name / domain?                                    | "Space Planner" is a working title                                        | Phase 4 (domain) |

## Explicitly deferred or rejected

Window-light calculation · multi-floor / whole-house · hard collision detection · auto-layout / AI
suggestions · native mobile apps · marketplace / transactional features.
