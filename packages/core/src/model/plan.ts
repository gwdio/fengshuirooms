// Serialized plan shape. See docs/architecture/data-model.md.
//
// All lengths are stored in inches (ADR-0008); `Plan.units` only controls display.
// Bump SCHEMA_VERSION and add a migration whenever a persisted shape changes.

export const SCHEMA_VERSION = 1

export type Units = 'imperial' | 'metric'
export type Layer = 'floor' | 'furniture' | 'elevated'
export type ItemShape = 'rect' | 'oval'
export type Facing = 'north' | 'south' | 'east' | 'west'

export interface Point {
  x: number
  y: number
}

export interface Plan {
  schemaVersion: number
  id: string
  name: string
  units: Units
  createdAt: number
  updatedAt: number
  rooms: Room[]
  layouts: Layout[]
  activeLayoutId: string
  annotations: Annotation[]
  background?: BackgroundImage
}

export interface Room {
  id: string
  /** Ordered; consecutive walls share endpoints and the last closes back to the first. */
  walls: Wall[]
  features: WallFeature[]
  fixedItems: FixedItem[]
}

export interface Wall {
  id: string
  start: Point
  end: Point
  /** Visual only. */
  thickness: number
}

export interface WallFeature {
  id: string
  wallId: string
  type: 'door' | 'window'
  /** 0–1 along the wall, measured from `start`. */
  position: number
  width: number
  swingDirection?: 'in' | 'out'
  hingeSide?: 'left' | 'right'
}

export interface FixedItem {
  id: string
  type: 'outlet' | 'vent' | 'radiator' | 'closet'
  position: Point
  width: number
  height: number
  rotation: number
  label?: string
}

export interface Layout {
  id: string
  name: string
  items: PlacedItem[]
  clearances: Clearance[]
}

export interface PlacedItem {
  id: string
  catalogId?: string
  shape: ItemShape
  /** Center of the item. */
  position: Point
  width: number
  height: number
  /** Degrees, clockwise. */
  rotation: number
  layer: Layer
  /** Occludes line of sight in the visibility view. */
  tall: boolean
  color?: string
  label?: string
  /** Side drawers/chairs pull out from. */
  frontFace?: Facing
}

export type ClearanceType = 'door-swing' | 'drawer' | 'chair-pullout' | 'custom'

export interface Clearance {
  id: string
  itemId: string
  shape: 'rect'
  /** Offset from the owning item's center, in the item's rotated frame. */
  offsetX: number
  offsetY: number
  width: number
  height: number
  rotation: number
  label?: string
  auto: boolean
  type: ClearanceType
}

export interface Annotation {
  id: string
  position: Point
  text: string
  color: string
}

export interface BackgroundImage {
  /** Data URL or remote URL. */
  src: string
  position: Point
  width: number
  height: number
  opacity: number
  scaleReference?: {
    pixelDistance: number
    realDistance: number
  }
}
