import {
  applyChanges,
  diffEntities,
  newId,
  toEntityMap,
  type ChangeBatch,
  type ChangeOrigin,
  type DocCollections,
  type Entity,
  type EntityChange,
  type EntityMap,
} from '@space-planner/core'
import { useMemo } from 'react'
import { create } from 'zustand'

// The open plan document (ADR-0011). Features read collections through hooks and write through
// commitCollection; everything that reacts to changes (persistence, selection, drags, and later
// undo and sync) subscribes with onChanges. Nothing else writes to this store.

interface DocState {
  /** Storage key / sync room for this document. */
  docId: string
  collections: DocCollections
}

export const useDoc = create<DocState>()(() => ({ docId: newId(), collections: {} }))

type ChangeListener = (batch: ChangeBatch) => void
const listeners = new Set<ChangeListener>()

/** Subscribes to every applied change batch. Returns an unsubscribe function. */
export function onChanges(listener: ChangeListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Applies a batch (from a local edit, a load, undo, or later a remote peer) and notifies listeners. */
export function applyBatch(batch: ChangeBatch): void {
  if (batch.changes.length === 0) return
  useDoc.setState((s) => ({ collections: applyChanges(s.collections, batch.changes) }))
  for (const l of listeners) l(batch)
}

/**
 * Replaces one collection with `next`, emitting only what changed. Entities that didn't change must
 * be the same objects as before (diffing is by reference).
 */
export function commitCollection<T extends Entity>(
  name: string,
  next: EntityMap<T> | readonly T[],
  origin: ChangeOrigin = 'local',
): void {
  const prev = useDoc.getState().collections[name] ?? {}
  const nextMap = Array.isArray(next) ? toEntityMap(next as readonly T[]) : (next as EntityMap<T>)
  applyBatch({ origin, changes: diffEntities(name, prev, nextMap) })
}

/** Swaps in a whole document (e.g. opening a saved plan), emitted as one 'load' batch. */
export function replaceDoc(docId: string, collections: DocCollections): void {
  const prev = useDoc.getState().collections
  const names = new Set([...Object.keys(prev), ...Object.keys(collections)])
  const changes: EntityChange[] = []
  for (const name of names) {
    changes.push(...diffEntities(name, prev[name] ?? {}, collections[name] ?? {}))
  }
  useDoc.setState({ docId, collections })
  for (const l of listeners) l({ origin: 'load', changes })
}

export function getCollection<T extends Entity>(name: string): EntityMap<T> {
  return (useDoc.getState().collections[name] ?? {}) as EntityMap<T>
}

const EMPTY: EntityMap = {}

export function useCollection<T extends Entity>(name: string): EntityMap<T> {
  return useDoc((s) => (s.collections[name] ?? EMPTY) as EntityMap<T>)
}

/** A collection as an array (stable between renders while the collection is unchanged). */
export function useCollectionList<T extends Entity>(name: string): readonly T[] {
  const map = useCollection<T>(name)
  return useMemo(() => Object.values(map), [map])
}
