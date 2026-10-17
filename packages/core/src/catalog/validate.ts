import type { Catalog } from './types.ts'

/** Returns a list of human-readable problems; empty means valid. */
export function validateCatalog(c: Catalog): string[] {
  const problems: string[] = []
  const categoryIds = new Set<string>()
  for (const cat of c.categories) {
    if (categoryIds.has(cat.id)) problems.push(`duplicate category id: ${cat.id}`)
    categoryIds.add(cat.id)
  }
  const itemIds = new Set<string>()
  for (const item of c.items) {
    if (itemIds.has(item.id)) problems.push(`duplicate item id: ${item.id}`)
    itemIds.add(item.id)
    if (!categoryIds.has(item.categoryId)) {
      problems.push(`${item.id}: unknown category ${item.categoryId}`)
    }
    if (!(item.defaultW > 0 && item.defaultH > 0)) {
      problems.push(`${item.id}: dimensions must be positive`)
    }
  }
  return problems
}
