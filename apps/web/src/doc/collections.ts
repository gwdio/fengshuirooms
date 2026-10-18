import type { CollectionSpec } from '@space-planner/core'

// Registry of document collections. A feature that stores data registers its spec here (see
// boot.ts); persistence (and later sync) handle every registered collection the same way.

const specs: CollectionSpec[] = []

export function registerCollection(spec: CollectionSpec): void {
  if (specs.some((s) => s.name === spec.name)) {
    throw new Error(`Collection "${spec.name}" registered twice`)
  }
  specs.push(spec)
}

export function registeredCollections(): readonly CollectionSpec[] {
  return specs
}
