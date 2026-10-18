import {
  clampScale,
  META_ID,
  metaCollection,
  wallCollection,
  type PlanMeta,
  type Viewport,
} from '@space-planner/core'
import { useViewport } from './editor/viewport.ts'
import { registerCollection } from './doc/collections.ts'
import './doc/history.ts' // starts recording the change stream
import { initPersistence } from './persistence/engine.ts'
import { registerLocalSetting } from './persistence/localSettings.ts'
import { isElementTool, useEditorStore, type ElementTool } from './state/editorStore.ts'

// App startup: features plug their data into the shared systems here, then persistence starts.
// To persist a new feature's data, register its collection (document data, later synced) or a
// local setting (per-browser preference).

registerCollection(metaCollection)
registerCollection(wallCollection)

registerLocalSetting<boolean>({
  key: 'snapToGrid',
  parse: (raw) => (typeof raw === 'boolean' ? raw : undefined),
  get: () => useEditorStore.getState().snapToGrid,
  set: (snapToGrid) => useEditorStore.setState({ snapToGrid }),
  subscribe: (onChange) =>
    useEditorStore.subscribe((s, prev) => {
      if (s.snapToGrid !== prev.snapToGrid) onChange()
    }),
})

registerLocalSetting<ElementTool>({
  key: 'lastElement',
  parse: (raw) => (isElementTool(raw) ? raw : undefined),
  get: () => useEditorStore.getState().lastElement,
  set: (lastElement) => useEditorStore.setState({ lastElement }),
  subscribe: (onChange) =>
    useEditorStore.subscribe((s, prev) => {
      if (s.lastElement !== prev.lastElement) onChange()
    }),
})

registerLocalSetting<Viewport>({
  key: 'viewport',
  parse: (raw) => {
    if (typeof raw !== 'object' || raw === null) return undefined
    const { scale, offset } = raw as { scale?: unknown; offset?: { x?: unknown; y?: unknown } }
    const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
    if (!finite(scale) || !finite(offset?.x) || !finite(offset?.y)) return undefined
    return { scale: clampScale(scale), offset: { x: offset.x, y: offset.y } }
  },
  get: () => useViewport.getState(),
  set: (vp) => useViewport.setState(vp),
  subscribe: (onChange) => useViewport.subscribe(onChange),
})

initPersistence({
  docName: (c) =>
    (c[metaCollection.name]?.[META_ID] as PlanMeta | undefined)?.name ?? 'Untitled plan',
})
