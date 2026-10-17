import {
  addWall as addWallToPlan,
  allWalls,
  createEmptyPlan,
  moveCorner as moveCornerInPlan,
  removeWalls as removeWallsFromPlan,
  normalizeWalls,
  translateWalls as translateWallsInPlan,
  type Plan,
  type Point,
} from '@space-planner/core'
import { create } from 'zustand'

// Single source of truth for the open plan. Undo/redo, persistence, and
// (later) collab sync all hang off this store — keep mutations going through actions.
interface PlanState {
  plan: Plan
  selectedIds: string[]
  setUnits: (units: Plan['units']) => void
  select: (ids: string[]) => void
  /** Returns the new wall's id, or undefined if the wall was zero-length. */
  addWall: (start: Point, end: Point) => string | undefined
  removeWalls: (ids: string[]) => void
  /** Moves wall endpoints at `from` to `to` (only `onlyWallIds`' if given). */
  moveCorner: (from: Point, to: Point, onlyWallIds?: string[]) => void
  translateWalls: (ids: string[], delta: Point) => void
}

export const usePlanStore = create<PlanState>()((set, get) => {
  /**
   * Every wall edit goes through here: walls are normalized (junctions split into corners, inline
   * pieces re-joined; ADR-0010) and the selection follows merged walls and drops deleted ones.
   */
  function commitWalls(next: Plan) {
    const { plan, replaced } = normalizeWalls(next)
    const ids = new Set(allWalls(plan).map((w) => w.id))
    set((s) => ({
      plan,
      selectedIds: [...new Set(s.selectedIds.map((id) => replaced.get(id) ?? id))].filter((id) =>
        ids.has(id),
      ),
    }))
  }

  return {
    plan: createEmptyPlan(),
    selectedIds: [],
    setUnits: (units) => set((s) => ({ plan: { ...s.plan, units, updatedAt: Date.now() } })),
    select: (selectedIds) => set({ selectedIds }),
    addWall: (start, end) => {
      const { plan, wall } = addWallToPlan(get().plan, start, end)
      if (wall) commitWalls(plan)
      return wall?.id
    },
    removeWalls: (ids) => commitWalls(removeWallsFromPlan(get().plan, ids)),
    moveCorner: (from, to, onlyWallIds) =>
      commitWalls(moveCornerInPlan(get().plan, from, to, onlyWallIds)),
    translateWalls: (ids, delta) => commitWalls(translateWallsInPlan(get().plan, ids, delta)),
  }
})
