import { SCHEMA_VERSION, type Plan, type Units } from './plan.ts'

export function newId(): string {
  return crypto.randomUUID()
}

export function createEmptyPlan(name = 'Untitled plan', units: Units = 'imperial'): Plan {
  const now = Date.now()
  const layoutId = newId()
  return {
    schemaVersion: SCHEMA_VERSION,
    id: newId(),
    name,
    units,
    createdAt: now,
    updatedAt: now,
    rooms: [],
    layouts: [{ id: layoutId, name: 'Layout A', items: [], clearances: [] }],
    activeLayoutId: layoutId,
    annotations: [],
  }
}
