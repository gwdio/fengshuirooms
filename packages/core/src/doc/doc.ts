// The plan document: named collections of entities keyed by id (ADR-0011). Every change is a batch
// of per-entity puts and deletes, tagged with where it came from. Persistence, undo, and realtime
// sync all consume the same batches; none of them know what a wall is.

export interface Entity {
  id: string
}

export type EntityMap<T extends Entity = Entity> = Readonly<Record<string, T>>

/** Collection name → entities. Collections nobody has written to may be absent. */
export type DocCollections = Readonly<Record<string, EntityMap>>

/**
 * Where a batch came from. Consumers use this to decide what to do: e.g. persistence saves
 * everything except 'load'; sync sends only 'local' and 'undo'; normalization runs only on 'local'.
 */
export type ChangeOrigin = 'local' | 'load' | 'remote' | 'undo'

/** One entity written (`value`) or deleted (`value: null`). Whole-entity granularity: last write wins. */
export interface EntityChange {
  collection: string
  id: string
  value: Entity | null
}

export interface ChangeBatch {
  origin: ChangeOrigin
  changes: readonly EntityChange[]
}

export function toEntityMap<T extends Entity>(list: readonly T[]): EntityMap<T> {
  const map: Record<string, T> = {}
  for (const e of list) map[e.id] = e
  return map
}

/**
 * The changes that turn `prev` into `next`. Entities are compared by reference, so unchanged
 * entities must be passed through as the same objects (the core wall functions do this).
 */
export function diffEntities(collection: string, prev: EntityMap, next: EntityMap): EntityChange[] {
  const changes: EntityChange[] = []
  for (const id in prev) {
    if (!(id in next)) changes.push({ collection, id, value: null })
  }
  for (const id in next) {
    if (prev[id] !== next[id]) changes.push({ collection, id, value: next[id]! })
  }
  return changes
}

/**
 * Applies changes, returning new collections (unchanged collections keep their identity).
 * Deleting something already gone and overwriting something changed elsewhere are both fine, so a
 * late or duplicate remote change can never throw.
 */
export function applyChanges(
  collections: DocCollections,
  changes: readonly EntityChange[],
): DocCollections {
  if (changes.length === 0) return collections
  const out: Record<string, Record<string, Entity>> = { ...collections }
  const touched = new Set<string>()
  for (const { collection, id, value } of changes) {
    if (!touched.has(collection)) {
      out[collection] = { ...(collections[collection] ?? {}) }
      touched.add(collection)
    }
    const target = out[collection]!
    if (value === null) delete target[id]
    else target[id] = value
  }
  return out
}
