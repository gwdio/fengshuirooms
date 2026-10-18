import {
  createWall,
  placeOpening as placeOpeningIn,
  type Point,
  type Wall,
} from '@space-planner/core'
import type { Tool } from '../state/editorStore.ts'
import { useSelection } from '../state/selectionStore.ts'
import { addWall, getWalls, placeOpening } from '../walls/walls.ts'
import { findOpeningHost, snapScreenPoint } from './snapping.ts'

// What the elements panel offers. Each entry can be picked as a tool (click) or dropped onto the
// canvas (drag). New kinds of things (furniture, later) are added here.

export interface PaletteEntry {
  id: string
  label: string
  description: string
  /** Tool selected when the entry is clicked. */
  tool: Tool
  /** What would be created by dropping at `stage` (px), for the ghost; undefined if nothing. */
  ghost(stage: Point): Wall | undefined
  /** Drops one in at `stage` (px). Returns the new entity's id. */
  drop(stage: Point): string | undefined
}

/** Length of a wall dropped from the panel, inches. */
const DROPPED_WALL_LENGTH = 48

function droppedWall(stage: Point): Wall | undefined {
  const c = snapScreenPoint(stage).point
  const half = DROPPED_WALL_LENGTH / 2
  return createWall({ x: c.x - half, y: c.y }, { x: c.x + half, y: c.y })
}

function openingEntry(kind: 'door' | 'window', label: string): PaletteEntry {
  return {
    id: kind,
    label,
    description: `Click, then click a wall, or drag onto a wall`,
    tool: kind,
    ghost(stage) {
      const target = findOpeningHost(stage)
      if (!target) return undefined
      const before = new Set(getWalls().map((w) => w.id))
      return placeOpeningIn(getWalls(), target.hostId, target.center, kind)?.find(
        (w) => w.kind === kind && !before.has(w.id),
      )
    },
    drop(stage) {
      const target = findOpeningHost(stage)
      return target && placeOpening(target.hostId, target.center, kind)
    },
  }
}

export const PALETTE: readonly PaletteEntry[] = [
  {
    id: 'wall',
    label: 'Wall',
    description: 'Click to draw walls, or drag in a 4′ wall',
    tool: 'wall',
    ghost: droppedWall,
    drop(stage) {
      const wall = droppedWall(stage)
      return wall && addWall(wall.start, wall.end)
    },
  },
  openingEntry('door', 'Door'),
  openingEntry('window', 'Window'),
]

/** After a drop, select what was created so it can be adjusted straight away. */
export function dropAndSelect(entry: PaletteEntry, stage: Point): void {
  const id = entry.drop(stage)
  if (id && getWalls().some((w) => w.id === id)) useSelection.getState().select([id])
}
