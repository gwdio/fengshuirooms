import {
  createWall,
  moveCorner as moveCornerIn,
  normalizeWalls,
  removeWalls as removeWallsFrom,
  translateWalls as translateWallsIn,
  wallCollection,
  type Point,
  type Wall,
} from '@space-planner/core'
import { commitCollection, getCollection, useCollectionList } from '../doc/docStore.ts'
import { remapSelection } from '../state/selectionStore.ts'

// The walls feature's view of the document. Every local wall edit goes through commitWalls, which
// normalizes (split junctions, merge inline walls; ADR-0010) and commits only what changed.

export function useWalls(): readonly Wall[] {
  return useCollectionList<Wall>(wallCollection.name)
}

export function getWalls(): readonly Wall[] {
  return Object.values(getCollection<Wall>(wallCollection.name))
}

function commitWalls(next: readonly Wall[], label: string) {
  const { walls, replaced } = normalizeWalls(next)
  remapSelection(replaced) // before the commit, so the survivor is selected when the old id is deleted
  commitCollection(wallCollection.name, walls, { label })
}

/** Returns the new wall's id, or undefined for a zero-length wall. */
export function addWall(start: Point, end: Point): string | undefined {
  const wall = createWall(start, end)
  if (!wall) return undefined
  commitWalls([...getWalls(), wall], 'Add wall')
  return wall.id
}

export function removeWalls(ids: readonly string[]): void {
  commitWalls(removeWallsFrom(getWalls(), ids), ids.length === 1 ? 'Delete wall' : 'Delete walls')
}

/** Moves wall endpoints at `from` to `to` (only `onlyWallIds`' endpoints, if given). */
export function moveCorner(from: Point, to: Point, onlyWallIds?: readonly string[]): void {
  commitWalls(moveCornerIn(getWalls(), from, to, onlyWallIds), 'Move corner')
}

export function translateWalls(ids: readonly string[], delta: Point): void {
  commitWalls(
    translateWallsIn(getWalls(), ids, delta),
    ids.length === 1 ? 'Move wall' : 'Move walls',
  )
}
