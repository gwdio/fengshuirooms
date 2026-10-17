import { createEmptyPlan, type Plan } from '@space-planner/core'
import { create } from 'zustand'

// Single source of truth for the open plan. Undo/redo, persistence, and
// (later) collab sync all hang off this store — keep mutations going through actions.
interface PlanState {
  plan: Plan
  selectedIds: string[]
  setUnits: (units: Plan['units']) => void
  select: (ids: string[]) => void
}

export const usePlanStore = create<PlanState>()((set) => ({
  plan: createEmptyPlan(),
  selectedIds: [],
  setUnits: (units) => set((s) => ({ plan: { ...s.plan, units, updatedAt: Date.now() } })),
  select: (selectedIds) => set({ selectedIds }),
}))
