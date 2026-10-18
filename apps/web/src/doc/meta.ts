import {
  createPlanMeta,
  META_ID,
  metaCollection,
  type PlanMeta,
  type Units,
} from '@space-planner/core'
import { commitCollection, getCollection, useCollection } from './docStore.ts'

// Plan-wide settings (name, units). A missing meta entity, as in a brand-new document or after a
// peer deleted it, reads as defaults, so the app never has to handle "no meta".

const DEFAULT_META = createPlanMeta()

export function useMeta(): PlanMeta {
  return useCollection<PlanMeta>(metaCollection.name)[META_ID] ?? DEFAULT_META
}

export function getMeta(): PlanMeta {
  return getCollection<PlanMeta>(metaCollection.name)[META_ID] ?? DEFAULT_META
}

export function setUnits(units: Units): void {
  commitCollection(metaCollection.name, [{ ...getMeta(), units }])
}
