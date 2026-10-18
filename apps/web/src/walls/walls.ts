import {
  createWall,
  flipDoor as flipDoorIn,
  isOpening,
  openingsToWalls,
  placeOpening as placeOpeningIn,
  slideOpening as slideOpeningIn,
  type OpeningKind,
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

const NAMES: Record<string, string> = { wall: 'wall', door: 'door', window: 'window' }

/**
 * Deletes the given segments the way the user expects: plain walls are removed, while doors and
 * windows are turned back into wall (which rejoins the wall around them).
 */
export function deleteSegments(ids: readonly string[]): void {
  const walls = getWalls()
  const chosen = walls.filter((w) => ids.includes(w.id))
  if (chosen.length === 0) return
  const openingIds = chosen.filter(isOpening).map((w) => w.id)
  const wallIds = chosen.filter((w) => !isOpening(w)).map((w) => w.id)
  const label =
    chosen.length === 1 ? `Delete ${NAMES[chosen[0]!.kind]}` : `Delete ${chosen.length} items`
  commitWalls(removeWallsFrom(openingsToWalls(walls, openingIds), wallIds), label)
}

/** Cuts a door or window into wall `hostId` near `center`. Returns the new opening's id. */
export function placeOpening(hostId: string, center: Point, kind: OpeningKind): string | undefined {
  const next = placeOpeningIn(getWalls(), hostId, center, kind)
  if (!next) return undefined
  const before = new Set(getWalls().map((w) => w.id))
  const opening = next.find((w) => w.kind === kind && !before.has(w.id))
  commitWalls(next, `Add ${kind}`)
  return opening?.id
}

export function slideOpening(id: string, center: Point): void {
  const next = slideOpeningIn(getWalls(), id, center)
  const kind = getWalls().find((w) => w.id === id)?.kind ?? 'door'
  if (next) commitWalls(next, `Move ${NAMES[kind]}`)
}

export function flipDoor(id: string, what: 'hinge' | 'swing'): void {
  commitWalls(
    flipDoorIn(getWalls(), id, what),
    what === 'hinge' ? 'Flip door hinge' : 'Flip door swing',
  )
}
