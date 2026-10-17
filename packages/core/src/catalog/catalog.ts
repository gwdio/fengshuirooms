import type { Catalog } from './types.ts'

// Hand-curated catalog. See docs/product/catalog.md for authoring rules.
// Phase 1 target: ~30 common items. Phase 2: ~80.
export const catalog: Catalog = {
  version: '0.1.0',
  categories: [
    { id: 'beds', name: 'Beds', icon: 'bed', defaultLayer: 'furniture', defaultTall: false },
    { id: 'storage', name: 'Storage', icon: 'box', defaultLayer: 'furniture', defaultTall: true },
  ],
  items: [
    {
      id: 'bed-queen',
      categoryId: 'beds',
      name: 'Queen bed',
      shape: 'rect',
      defaultW: 60,
      defaultH: 80,
      tall: false,
      resizable: true,
      tags: ['bed', 'queen'],
    },
    {
      id: 'dresser-6-drawer',
      categoryId: 'storage',
      name: '6-drawer dresser',
      shape: 'rect',
      defaultW: 60,
      defaultH: 18,
      tall: false,
      resizable: true,
      tags: ['dresser', 'drawers'],
      frontFace: 'south',
      autoClearances: [
        {
          shape: 'rect',
          offsetX: 0,
          offsetY: 18,
          width: 60,
          height: 18,
          rotation: 0,
          label: 'Open drawers',
          auto: true,
          type: 'drawer',
        },
      ],
    },
  ],
}
