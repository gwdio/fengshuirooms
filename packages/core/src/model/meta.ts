import { isFiniteNumber, isObject, isString, type CollectionSpec } from '../doc/collection.ts'
import type { Units } from './entities.ts'

/** Plan-wide settings, stored as the single entity `plan` in the `meta` collection. */
export interface PlanMeta {
  id: typeof META_ID
  name: string
  units: Units
  createdAt: number
}

export const META_ID = 'plan'

export function createPlanMeta(name = 'Untitled plan', units: Units = 'imperial'): PlanMeta {
  return { id: META_ID, name, units, createdAt: Date.now() }
}

export const metaCollection: CollectionSpec<PlanMeta> = {
  name: 'meta',
  version: 1,
  parse(raw) {
    if (!isObject(raw) || raw.id !== META_ID) return undefined
    if (!isString(raw.name) || !isFiniteNumber(raw.createdAt)) return undefined
    if (raw.units !== 'imperial' && raw.units !== 'metric') return undefined
    return { id: META_ID, name: raw.name, units: raw.units, createdAt: raw.createdAt }
  },
}
