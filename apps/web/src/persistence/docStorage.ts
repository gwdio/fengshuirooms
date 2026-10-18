// Raw document storage in the browser. Knows nothing about what's inside a document; the engine
// serializes with core's snapshot format. Keys (all prefixed `space-planner:`):
//   docs              index: [{ id, name, updatedAt }], most recently saved first
//   doc:<id>          one snapshot (JSON)
//   doc-backup:<id>   the last version that loaded with problems, kept before it's overwritten
//   activeDocId       the document to open on startup
//   local:<key>       a per-browser setting (not part of any document)

export interface DocSummary {
  id: string
  name: string
  updatedAt: number
}

/** The subset of the Web Storage API used here; tests pass an in-memory fake. */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const P = 'space-planner:'
const INDEX = `${P}docs`
const ACTIVE = `${P}activeDocId`

export class DocStorage {
  private readonly storage: StorageLike

  constructor(storage: StorageLike) {
    this.storage = storage
  }

  list(): DocSummary[] {
    try {
      const parsed: unknown = JSON.parse(this.storage.getItem(INDEX) ?? '[]')
      return Array.isArray(parsed) ? parsed.filter(isSummary) : []
    } catch {
      return []
    }
  }

  read(id: string): string | null {
    return this.storage.getItem(`${P}doc:${id}`)
  }

  /** Writes a document and moves it to the top of the index. Throws if storage is full. */
  write(summary: DocSummary, data: string): void {
    this.storage.setItem(`${P}doc:${summary.id}`, data)
    const rest = this.list().filter((d) => d.id !== summary.id)
    this.storage.setItem(INDEX, JSON.stringify([summary, ...rest]))
  }

  backup(id: string, data: string): void {
    this.storage.setItem(`${P}doc-backup:${id}`, data)
  }

  remove(id: string): void {
    this.storage.removeItem(`${P}doc:${id}`)
    this.storage.setItem(INDEX, JSON.stringify(this.list().filter((d) => d.id !== id)))
    if (this.activeId() === id) this.storage.removeItem(ACTIVE)
  }

  activeId(): string | null {
    return this.storage.getItem(ACTIVE)
  }

  setActiveId(id: string): void {
    this.storage.setItem(ACTIVE, id)
  }

  readLocal(key: string): unknown {
    try {
      const raw = this.storage.getItem(`${P}local:${key}`)
      return raw === null ? undefined : JSON.parse(raw)
    } catch {
      return undefined
    }
  }

  writeLocal(key: string, value: unknown): void {
    this.storage.setItem(`${P}local:${key}`, JSON.stringify(value))
  }
}

function isSummary(v: unknown): v is DocSummary {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  return typeof s.id === 'string' && typeof s.name === 'string' && typeof s.updatedAt === 'number'
}

/** In-memory storage, used when the browser blocks localStorage (and in tests). */
export function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, String(v)),
    removeItem: (k) => void data.delete(k),
  }
}
