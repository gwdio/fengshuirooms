import type { Entity } from './doc.ts'

/**
 * How a feature's entities are stored. Features register one of these (like keyboard bindings),
 * and persistence and sync handle the rest without knowing the entity type.
 */
export interface CollectionSpec<T extends Entity = Entity> {
  name: string
  /** Bump when the stored entity shape changes, and add a migration from the previous version. */
  version: number
  /** Upgrades one stored entity from version N to N+1, keyed by N. Never edit an existing one. */
  migrations?: Record<number, (raw: unknown) => unknown>
  /** Validates one stored or received entity. Returns undefined if it's unusable. */
  parse(raw: unknown): T | undefined
}

// Small validation helpers for parse() implementations.
export function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
export function isString(v: unknown): v is string {
  return typeof v === 'string'
}
export function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}
export function isPoint(v: unknown): v is { x: number; y: number } {
  return isObject(v) && isFiniteNumber(v.x) && isFiniteNumber(v.y)
}
