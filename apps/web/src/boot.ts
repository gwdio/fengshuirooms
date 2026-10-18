import { META_ID, metaCollection, wallCollection, type PlanMeta } from '@space-planner/core'
import { registerCollection } from './doc/collections.ts'
import './doc/history.ts' // starts recording the change stream
import { initPersistence } from './persistence/engine.ts'
import { registerLocalSetting } from './persistence/localSettings.ts'
import { useEditorStore } from './state/editorStore.ts'

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

initPersistence({
  docName: (c) =>
    (c[metaCollection.name]?.[META_ID] as PlanMeta | undefined)?.name ?? 'Untitled plan',
})
