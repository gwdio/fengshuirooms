import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { useApp } from './harness.ts'

describe('Pan tool', () => {
  const app = useApp()
  beforeEach(() => app.reset())

  const active = (id: string) =>
    app.page.$eval(`[data-tool="${id}"]`, (b) => b.getAttribute('aria-pressed') === 'true')

  /** Drags on the canvas in raw pixels and returns how far the first wall moved on screen. */
  async function dragAndMeasure(dx: number, dy: number): Promise<{ dx: number; dy: number }> {
    const firstPoint = () =>
      app.page.evaluate(() =>
        (
          window.Konva.stages[0]!.getLayers()[1]!.getChildren()[0] as unknown as {
            getChildren(): { points(): number[] }[]
          }
        )
          .getChildren()[0]!
          .points()
          .slice(0, 2),
      )
    const [x0, y0] = await firstPoint()
    await app.page.mouse.move(...app.canvasPx(400, 400))
    await app.page.mouse.down()
    await app.page.mouse.move(...app.canvasPx(400 + dx, 400 + dy), { steps: 6 })
    await app.page.mouse.up()
    const [x1, y1] = await firstPoint()
    return { dx: x1! - x0!, dy: y1! - y0! }
  }

  it('tapping Space toggles Pan on and back to the previous tool', async () => {
    await app.tool('wall')
    await app.key(' ')
    assert.equal(await active('pan'), true)
    await app.key(' ')
    assert.match(await app.pressed(), /Wall/)
    assert.equal(await active('pan'), false)
  })

  it('in the Pan tool, left-drag pans and edits nothing', async () => {
    await app.drawChain([24, 24], [96, 24])
    await app.key('v')
    await app.key(' ')
    const moved = await dragAndMeasure(60, 20)
    assert.deepEqual(moved, { dx: 60, dy: 20 })
    assert.deepEqual(await app.walls(), ['24,24,96,24'])
    assert.equal(await active('pan'), true) // still panning after the drag
  })

  it('holding Space pans temporarily and leaves the tool alone', async () => {
    await app.drawChain([24, 24], [96, 24])
    await app.key('v')
    await app.page.keyboard.down(' ')
    const moved = await dragAndMeasure(-40, 0)
    await app.page.keyboard.up(' ')
    assert.deepEqual(moved, { dx: -40, dy: 0 })
    assert.equal(await active('select'), true)
    assert.equal(await active('pan'), false)
  })

  it('a long Space hold without dragging does not toggle', async () => {
    await app.page.keyboard.down(' ')
    await new Promise((r) => setTimeout(r, 600))
    await app.page.keyboard.up(' ')
    assert.equal(await active('select'), true)
  })

  it('the toolbar button and Escape toggle it too', async () => {
    await app.tool('door')
    await app.page.click('[data-tool="pan"]')
    assert.equal(await active('pan'), true)
    await app.key('Escape')
    assert.match(await app.pressed(), /Door/)
  })
})
