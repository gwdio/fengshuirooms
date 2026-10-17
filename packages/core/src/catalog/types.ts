import type { Clearance, Facing, ItemShape, Layer } from '../model/plan.ts'

export interface Catalog {
  version: string
  categories: Category[]
  items: CatalogItem[]
}

export interface Category {
  id: string
  name: string
  icon: string
  defaultLayer: Layer
  defaultTall: boolean
}

export interface CatalogItem {
  id: string
  categoryId: string
  name: string
  shape: ItemShape
  /** Inches. */
  defaultW: number
  /** Inches. */
  defaultH: number
  tall: boolean
  resizable: boolean
  tags: string[]
  frontFace?: Facing
  autoClearances?: Omit<Clearance, 'id' | 'itemId'>[]
}
