// Entity types. A plan is a document of entity collections keyed by id (ADR-0011), not a nested
// tree: each entity can be created, changed, or deleted independently, which is what persistence,
// undo, and realtime sync all need. Only walls have a collection so far; the other types are the
// intended shapes for features that haven't been built.
//
// All lengths are inches (ADR-0008).

export type Units = 'imperial' | 'metric'
export type Layer = 'floor' | 'furniture' | 'elevated'
export type ItemShape = 'rect' | 'oval'
export type Facing = 'north' | 'south' | 'east' | 'west'

export interface Point {
  x: number
  y: number
}

/** What a wall segment is: solid wall, or an opening in the wall line (ADR-0013). */
export type WallKind = 'wall' | 'door' | 'window'

/**
 * A straight segment of the wall network, never curved. Doors and windows are segments too: an
 * opening sits in the wall line between two plain wall pieces (ADR-0013). Connected segments share
 * exact endpoint coordinates, and walls are kept normalized (ADR-0010).
 */
export interface Wall {
  id: string
  kind: WallKind
  start: Point
  end: Point
  /** Visual only. */
  thickness: number
  /** Doors only: which end the door is hinged at. */
  hinge?: 'start' | 'end'
  /**
   * Doors only: which side the door swings to, looking from `start` to `end` on screen (y down).
   * 'left' of an eastward door is north.
   */
  swing?: 'left' | 'right'
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
}

export interface PlacedItem {
  id: string
  layoutId: string
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
