import {
  readSnapshot,
  SnapshotError,
  writeSnapshot,
  type CollectionSpec,
  type DocCollections,
  type StoredCollection,
} from '@space-planner/core'
import { registeredCollections } from '../doc/collections.ts'
import { onChanges, replaceDoc, useDoc } from '../doc/docStore.ts'
import { useNoticeStore } from '../state/noticeStore.ts'
import { DocStorage, memoryStorage, type StorageLike } from './docStorage.ts'
import { registeredLocalSettings, type LocalSetting } from './localSettings.ts'

// Persistence engine. It doesn't know about walls or any other feature: it restores and saves
// whatever collections and local settings are registered, driven by the document's change stream.
//
// - On start: restore local settings, then open the last document. Damaged entities are dropped
//   individually and unknown or newer collections are kept aside and written back (core snapshot
//   rules). If a document can't be read at all, a fresh one is started and the old data is left
//   untouched.
// - Then: every non-'load' change batch (local edits now; undo and remote changes later) schedules
//   a save. Saves are debounced and flushed when the page is hidden or closed.

export interface PersistenceOptions {
  storage?: StorageLike
  collections?: readonly CollectionSpec[]
  localSettings?: readonly LocalSetting[]
  /** Display name for the document index (the plan list). */
  docName?: (collections: DocCollections) => string
  saveDelayMs?: number
}

export interface PersistenceHandle {
  /** Saves now if anything is pending. */
  flush(): void
  stop(): void
}

export function initPersistence(opts: PersistenceOptions = {}): PersistenceHandle {
  const storage = new DocStorage(opts.storage ?? browserStorage())
  const specs = opts.collections ?? registeredCollections()
  const settings = opts.localSettings ?? registeredLocalSettings()
  const docName = opts.docName ?? (() => 'Untitled plan')
  const notice = useNoticeStore.getState()

  const stopSettings = settings.map((setting) => {
    const stored = setting.parse(storage.readLocal(setting.key))
    if (stored !== undefined) setting.set(stored)
    return setting.subscribe(() => {
      try {
        storage.writeLocal(setting.key, setting.get())
      } catch {
        // Settings are a convenience; failing to save one isn't worth a notice.
      }
    })
  })

  let preserved: Record<string, StoredCollection> = {}
  const id = storage.activeId() ?? storage.list()[0]?.id
  const raw = id ? storage.read(id) : null
  if (id && raw !== null) {
    try {
      const result = readSnapshot(raw, specs)
      preserved = result.preserved
      if (result.problems.length > 0) {
        storage.backup(id, raw)
        notice.show(`Some of your plan couldn't be loaded: ${result.problems.join('; ')}.`)
      }
      replaceDoc(id, result.collections)
    } catch (e) {
      if (!(e instanceof SnapshotError)) throw e
      // A fresh document has a new id, so saving it can never overwrite the unreadable one.
      notice.show(
        `Couldn't open your last plan (${e.message}). Starting a new one; the old data is kept.`,
      )
    }
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  let dirty = false
  let failing = false

  function flush() {
    clearTimeout(timer)
    if (!dirty) return
    const { docId, collections } = useDoc.getState()
    try {
      const data = JSON.stringify(writeSnapshot(collections, specs, preserved))
      storage.write({ id: docId, name: docName(collections), updatedAt: Date.now() }, data)
      storage.setActiveId(docId)
      dirty = false
      if (failing) {
        failing = false
        useNoticeStore.getState().dismiss()
      }
    } catch {
      failing = true
      useNoticeStore
        .getState()
        .show("Couldn't save your plan. Browser storage may be full. Recent changes aren't stored.")
    }
  }

  const stopChanges = onChanges(({ origin }) => {
    if (origin === 'load') return
    dirty = true
    clearTimeout(timer)
    timer = setTimeout(flush, opts.saveDelayMs ?? 400)
  })

  const onHide = () => {
    if (document.visibilityState === 'hidden') flush()
  }
  const hasDom = typeof window !== 'undefined'
  if (hasDom) {
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onHide)
  }

  return {
    flush,
    stop() {
      flush()
      stopChanges()
      stopSettings.forEach((stop) => stop())
      if (hasDom) {
        window.removeEventListener('pagehide', flush)
        document.removeEventListener('visibilitychange', onHide)
      }
    },
  }
}

function browserStorage(): StorageLike {
  try {
    const ls = window.localStorage
    const probe = 'space-planner:probe'
    ls.setItem(probe, '1')
    ls.removeItem(probe)
    return ls
  } catch {
    useNoticeStore
      .getState()
      .show("This browser is blocking storage, so plans won't be saved after you close the tab.")
    return memoryStorage()
  }
}
