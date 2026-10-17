import { describe, expect, it } from 'vitest'
import { catalog } from './catalog.ts'
import { validateCatalog } from './validate.ts'

describe('catalog', () => {
  it('is valid', () => {
    expect(validateCatalog(catalog)).toEqual([])
  })

  it('reports duplicate ids and unknown categories', () => {
    const item = catalog.items[0]!
    const problems = validateCatalog({
      ...catalog,
      items: [item, { ...item, categoryId: 'nope' }],
    })
    expect(problems).toContain(`duplicate item id: ${item.id}`)
    expect(problems).toContain(`${item.id}: unknown category nope`)
  })
})
