import type { CollectionSpec } from './collection.ts'
import { isObject } from './collection.ts'
import type { DocCollections, Entity, EntityMap } from './doc.ts'

// Serialized form of a whole document, used for browser storage now and full-state sync later.
//
// Reading is forgiving, because data may come from an older or newer app, a half-written save, or
// (later) another client. An entity that fails validation is dropped on its own, not the whole
// document. A collection this app doesn't know, or one from a newer version, is kept verbatim and
// written back on the next save, so nothing is lost.

export const SNAPSHOT_FORMAT = 1

export interface StoredCollection {
  version: number
  entities: unknown[]
}

export interface Snapshot {
  format: typeof SNAPSHOT_FORMAT
  collections: Record<string, StoredCollection>
}

export class SnapshotError extends Error {
  override name = 'SnapshotError'
}

export interface ReadResult {
  collections: DocCollections
  /** Stored collections that couldn't be loaded; pass back to writeSnapshot unchanged. */
  preserved: Record<string, StoredCollection>
  /** Human-readable notes about anything dropped or kept aside. Empty when all is well. */
  problems: string[]
}

export function writeSnapshot(
  collections: DocCollections,
  specs: readonly CollectionSpec[],
  preserved: Record<string, StoredCollection> = {},
): Snapshot {
  const out: Record<string, StoredCollection> = { ...preserved }
  for (const spec of specs) {
    out[spec.name] = {
      version: spec.version,
      entities: Object.values(collections[spec.name] ?? {}),
    }
  }
  return { format: SNAPSHOT_FORMAT, collections: out }
}

/** Throws SnapshotError only when the data isn't a snapshot at all. */
export function readSnapshot(input: unknown, specs: readonly CollectionSpec[]): ReadResult {
  let raw = input
  if (typeof input === 'string') {
    try {
      raw = JSON.parse(input)
    } catch {
      throw new SnapshotError('not valid JSON')
    }
  }
  if (!isObject(raw) || !isObject(raw.collections)) throw new SnapshotError('not a saved plan')
  if (raw.format !== SNAPSHOT_FORMAT) {
    throw new SnapshotError(`unknown save format ${String(raw.format)}`)
  }

  const collections: Record<string, EntityMap> = {}
  const preserved: Record<string, StoredCollection> = {}
  const problems: string[] = []
  const bySpec = new Map(specs.map((s) => [s.name, s]))

  for (const [name, stored] of Object.entries(raw.collections)) {
    const spec = bySpec.get(name)
    if (!isStoredCollection(stored)) {
      problems.push(`"${name}" was unreadable and has been skipped`)
      continue
    }
    if (!spec) {
      preserved[name] = stored // from a newer app or a removed feature; keep it
      continue
    }
    if (stored.version > spec.version) {
      preserved[name] = stored
      problems.push(`"${name}" was saved by a newer version of the app and can't be shown`)
      continue
    }
    const loaded = loadCollection(spec, stored)
    if (!loaded) {
      preserved[name] = stored
      problems.push(`"${name}" couldn't be upgraded from version ${stored.version}`)
      continue
    }
    collections[name] = loaded.entities
    if (loaded.dropped > 0) {
      problems.push(
        `${loaded.dropped} damaged ${name} entr${loaded.dropped === 1 ? 'y was' : 'ies were'} removed`,
      )
    }
  }
  return { collections, preserved, problems }
}

function loadCollection(
  spec: CollectionSpec,
  stored: StoredCollection,
): { entities: EntityMap; dropped: number } | undefined {
  const entities: Record<string, Entity> = {}
  let dropped = 0
  for (const rawEntity of stored.entities) {
    let current = rawEntity
    for (let v = stored.version; v < spec.version; v++) {
      const step = spec.migrations?.[v]
      if (!step) return undefined
      current = step(current)
    }
    const entity = spec.parse(current)
    if (!entity || entity.id in entities) dropped++
    else entities[entity.id] = entity
  }
  return { entities, dropped }
}

function isStoredCollection(v: unknown): v is StoredCollection {
  return (
    isObject(v) &&
    typeof v.version === 'number' &&
    Number.isInteger(v.version) &&
    v.version >= 1 &&
    Array.isArray(v.entities)
  )
}
