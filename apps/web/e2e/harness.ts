// Browser test harness: drives the real app in headless Firefox via puppeteer-core.
// Uses the system Firefox (FIREFOX_PATH, default /usr/bin/firefox); nothing is downloaded.
// All coordinates in tests are plan inches; helpers convert to screen pixels.
import assert from 'node:assert/strict'
import { after, before } from 'node:test'
import puppeteer, { type Browser, type Page } from 'puppeteer-core'

// Must match apps/web/src/editor/viewport.ts until zoom/pan exists.
const PX_PER_INCH = 4

declare global {
  interface Window {
    Konva: typeof import('konva').default
  }
}

export interface App {
  page: Page
  /** Opens the app with empty storage and an empty plan. */
  reset(): Promise<void>
  /** Reloads the page, keeping storage. */
  reload(): Promise<void>
  /** Reads a `space-planner:`-prefixed localStorage key. */
  storage(key: string): Promise<string | null>
  setStorage(key: string, value: string): Promise<void>
  /** Text of the notice bar, or null if none is shown. */
  notice(): Promise<string | null>
  click(x: number, y: number): Promise<void>
  /** Press at (x1,y1), move in steps, release at (x2,y2). */
  drag(x1: number, y1: number, x2: number, y2: number): Promise<void>
  /** Picks a tool from the elements panel ('wall' | 'door' | 'window'). */
  tool(name: string): Promise<void>
  /** Drags an entry from the elements panel and drops it on the canvas at (x, y) inches. */
  dropFromPanel(name: string, x: number, y: number): Promise<void>
  /** Drags whatever is at (x, y) off the canvas and releases it over the elements panel. */
  dragOut(x: number, y: number): Promise<void>
  /** Clicks each point in order with the wall tool, then presses Enter. Leaves the wall tool active. */
  drawChain(...points: [number, number][]): Promise<void>
  key(key: string): Promise<void>
  /** Presses a combination like "Control+Shift+z". */
  chord(combo: string): Promise<void>
  /** Wall segments (including doors/windows) as "x1,y1,x2,y2" strings in inches, sorted. */
  walls(): Promise<string[]>
  /** Like walls(), prefixed with the segment kind: "door:42,24,78,24". */
  segments(): Promise<string[]>
  /** Text of the pressed toolbar buttons, e.g. "Select V | Grid snap on G". */
  pressed(): Promise<string>
  gridLabel(): Promise<string>
  selectionLabel(): Promise<string>
  /** Asserts every wall corner has exactly one handle and every handle sits on a corner. */
  assertHandlesOnCorners(): Promise<void>
}

/** Registers before/after hooks that launch Firefox and open the app; returns the live App. */
export function useApp(): App {
  const baseUrl = process.env.E2E_BASE_URL
  if (!baseUrl) throw new Error('E2E_BASE_URL not set; run through `npm run e2e`')
  let browser: Browser
  let origin = { x: 0, y: 0 }
  const app = { page: undefined as unknown as Page } as App

  before(async () => {
    browser = await puppeteer.launch({
      browser: 'firefox',
      executablePath: process.env.FIREFOX_PATH ?? '/usr/bin/firefox',
      headless: true,
      // Find-as-you-type would swallow shortcut keys the app forgets to claim.
      extraPrefsFirefox: { 'accessibility.typeaheadfind': true },
    })
    app.page = await browser.newPage()
    app.page.on('pageerror', (e) => {
      throw e
    })
    await app.page.setViewport({ width: 1400, height: 900 })
    await app.reset()
  })

  after(async () => {
    await browser?.close()
  })

  const screen = (x: number, y: number): [number, number] => [
    origin.x + x * PX_PER_INCH,
    origin.y + y * PX_PER_INCH,
  ]

  async function open() {
    await app.page.waitForFunction(() => window.Konva?.stages[0]?.width() > 0)
    origin = await app.page.evaluate(() => {
      const r = window.Konva.stages[0]!.container().getBoundingClientRect()
      return { x: r.x, y: r.y }
    })
  }
  app.reset = async () => {
    await app.page.goto(baseUrl, { waitUntil: 'load' })
    await app.page.evaluate(() => localStorage.clear())
    await app.page.goto(baseUrl, { waitUntil: 'load' })
    await open()
  }
  app.reload = async () => {
    await app.page.reload({ waitUntil: 'load' })
    await open()
  }
  app.storage = async (key) =>
    app.page.evaluate((k) => localStorage.getItem(`space-planner:${k}`), key)
  app.setStorage = async (key, value) =>
    app.page.evaluate(([k, v]) => localStorage.setItem(`space-planner:${k}`, v), [
      key,
      value,
    ] as const)
  app.notice = async () =>
    app.page.evaluate(() => document.querySelector('[role="alert"]')?.textContent ?? null)
  app.click = async (x, y) => app.page.mouse.click(...screen(x, y))
  app.drag = async (x1, y1, x2, y2) => {
    await app.page.mouse.move(...screen(x1, y1))
    await app.page.mouse.down()
    await app.page.mouse.move(...screen(x2, y2), { steps: 10 })
    await app.page.mouse.up()
  }
  const paletteCenter = async (name: string) => {
    const box = await (await app.page.$(`[data-palette="${name}"]`))!.boundingBox()
    return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 }
  }
  app.tool = async (name) => {
    await app.page.click(`[data-palette="${name}"]`)
  }
  app.dropFromPanel = async (name, x, y) => {
    const from = await paletteCenter(name)
    await app.page.mouse.move(from.x, from.y)
    await app.page.mouse.down()
    await app.page.mouse.move(...screen(x, y), { steps: 12 })
    await app.page.mouse.up()
  }
  app.dragOut = async (x, y) => {
    const panel = await paletteCenter('window')
    await app.page.mouse.move(...screen(x, y))
    await app.page.mouse.down()
    await app.page.mouse.move(panel.x, panel.y + 120, { steps: 12 })
    await app.page.mouse.up()
  }
  app.drawChain = async (...points) => {
    await app.tool('wall')
    for (const [x, y] of points) await app.click(x, y)
    await app.key('Enter')
  }
  app.key = async (key) => app.page.keyboard.press(key as Parameters<Page['keyboard']['press']>[0])
  app.chord = async (combo) => {
    const keys = combo.split('+') as Parameters<Page['keyboard']['press']>[0][]
    const main = keys.pop()!
    for (const k of keys) await app.page.keyboard.down(k)
    await app.page.keyboard.press(main)
    for (const k of keys.reverse()) await app.page.keyboard.up(k)
  }
  app.walls = async () =>
    app.page.evaluate((ppi) => {
      const layer = window.Konva.stages[0]!.getLayers()[1]!
      return layer
        .getChildren()
        .map((g) => {
          const line = (
            g as unknown as { getChildren(): { points(): number[] }[] }
          ).getChildren()[0]!
          return line
            .points()
            .map((v) => v / ppi)
            .join(',')
        })
        .sort()
    }, PX_PER_INCH)
  app.segments = async () =>
    app.page.evaluate((ppi) => {
      const layer = window.Konva.stages[0]!.getLayers()[1]!
      return layer
        .getChildren()
        .map((g) => {
          const line = (
            g as unknown as { getChildren(): { points(): number[] }[] }
          ).getChildren()[0]!
          return `${g.name()}:${line
            .points()
            .map((v) => v / ppi)
            .join(',')}`
        })
        .sort()
    }, PX_PER_INCH)
  app.pressed = async () =>
    app.page.$$eval('button[aria-pressed="true"]', (bs) =>
      bs.map((b) => b.textContent?.trim()).join(' | '),
    )
  app.gridLabel = async () =>
    app.page.$eval('button[title^="Snap"]', (b) => b.textContent?.trim() ?? '')
  app.selectionLabel = async () =>
    app.page.$eval('aside:last-of-type', (a) => a.textContent?.trim() ?? '')
  app.assertHandlesOnCorners = async () => {
    const { handles, corners } = await app.page.evaluate(() => {
      const stage = window.Konva.stages[0]!
      const corners = new Set<string>()
      for (const g of stage.getLayers()[1]!.getChildren()) {
        const p = (g as unknown as { getChildren(): { points(): number[] }[] })
          .getChildren()[0]!
          .points()
        corners.add(`${p[0]},${p[1]}`)
        corners.add(`${p[2]},${p[3]}`)
      }
      const layer = stage.getLayers()[2]
      const handles = layer
        ? layer
            .getChildren()
            .filter((n) => n.draggable())
            .map((n) => `${n.x()},${n.y()}`)
        : []
      return { handles: handles.sort(), corners: [...corners].sort() }
    })
    assert.deepEqual(handles, corners, 'corner handles out of sync with wall corners')
  }
  return app
}
