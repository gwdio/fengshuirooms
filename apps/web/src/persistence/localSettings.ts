// Per-browser settings (e.g. grid snap): saved locally, never part of a document, never synced.
// A feature registers one (see boot.ts) and persistence restores and saves it.

export interface LocalSetting<T = unknown> {
  /** Storage key; keep it stable. */
  key: string
  /** Validates a stored value. Returns undefined to ignore it and keep the default. */
  parse(raw: unknown): T | undefined
  get(): T
  set(value: T): void
  /** Calls `onChange` whenever the value changes. Returns an unsubscribe function. */
  subscribe(onChange: () => void): () => void
}

const settings: LocalSetting[] = []

export function registerLocalSetting<T>(setting: LocalSetting<T>): void {
  if (settings.some((s) => s.key === setting.key)) {
    throw new Error(`Local setting "${setting.key}" registered twice`)
  }
  settings.push(setting as LocalSetting)
}

export function registeredLocalSettings(): readonly LocalSetting[] {
  return settings
}
