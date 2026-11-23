import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { useApp } from './harness.ts'

describe('zoom and pan', () => {
  const app = useApp()
  beforeEach(() => app.reset())

  it('wheel zooms toward the pointer, keeping the point under it fixed', async () => {
    await app.page.mouse.move(...app.canvasPx(240, 240)) // world (60, 60) at 100%
    await app.page.mouse.wheel({ deltaY: -462 }) // ≈ ×2
    assert.equal(await app.zoomLabel(), '200%')
    // At 200%, 1" = 8px; the world point (60,60) is still at (240,240).
    await app.tool('wall')
    await app.page.mouse.click(...app.canvasPx(240, 240))
    await app.page.mouse.click(...app.canvasPx(240 + 96, 240))
    await app.key('Enter')
    assert.deepEqual(await app.walls(), ['60,60,72,60'])
  })

  it('holding Space and dragging pans instead of drawing', async () => {
    await app.tool('wall')
    await app.page.keyboard.down(' ')
    await app.page.mouse.move(...app.canvasPx(300, 300))
    await app.page.mouse.down()
    await app.page.mouse.move(...app.canvasPx(348, 300), { steps: 6 })
    await app.page.mouse.up()
    await app.page.keyboard.up(' ')
    assert.deepEqual(await app.walls(), [])
    // Panned right 48px = 12": world (24,24) is now at (144, 96).
    await app.page.mouse.click(...app.canvasPx(144, 96))
    await app.page.mouse.click(...app.canvasPx(432, 96))
    await app.key('Enter')
    assert.deepEqual(await app.walls(), ['24,24,96,24'])
  })

  it('middle-drag pans in any tool', async () => {
    await app.drawChain([24, 24], [96, 24])
    await app.key('v')
    await app.page.mouse.move(...app.canvasPx(300, 300))
    await app.page.mouse.down({ button: 'middle' })
    await app.page.mouse.move(...app.canvasPx(300, 348), { steps: 6 })
    await app.page.mouse.up({ button: 'middle' })
    assert.deepEqual(await app.walls(), ['24,24,96,24']) // the data didn't move…
    const firstWallY = await app.page.evaluate(
      () =>
        (
          window.Konva.stages[0]!.getLayers()[1]!.getChildren()[0] as unknown as {
            getChildren(): { points(): number[] }[]
          }
        )
          .getChildren()[0]!
          .points()[1],
    )
    assert.equal(firstWallY, 96 + 48) // …but it's drawn 48px lower
  })

  it('zoom buttons and keyboard shortcuts', async () => {
    await app.page.click('button[title^="Zoom in"]')
    assert.equal(await app.zoomLabel(), '125%')
    await app.chord('Control+-')
    assert.equal(await app.zoomLabel(), '100%')
    await app.chord('Control+=')
    await app.chord('Control+=')
    assert.equal(await app.zoomLabel(), '156%')
    await app.chord('Control+0')
    assert.equal(await app.zoomLabel(), '100%')
  })

  it('Fit frames the whole plan', async () => {
    // Draw a plan bigger than the canvas at 100%: zoom out, draw across the screen, zoom back in.
    for (let i = 0; i < 4; i++) await app.chord('Control+-')
    await app.tool('wall')
    for (const [x, y] of [
      [40, 40],
      [800, 40],
      [800, 700],
    ] as const)
      await app.page.mouse.click(...app.canvasPx(x, y))
    await app.key('Enter')
    await app.key('v')
    await app.chord('Control+0')
    await app.page.click('button[title^="Fit"]')
    const zoom = parseInt(await app.zoomLabel(), 10)
    assert.ok(zoom < 100, `zoomed out to fit (${zoom}%)`)
    const inside = await app.page.evaluate(() => {
      const stage = window.Konva.stages[0]!
      const pts = stage
        .getLayers()[1]!
        .getChildren()
        .flatMap((g) =>
          (g as unknown as { getChildren(): { points(): number[] }[] }).getChildren()[0]!.points(),
        )
      const xs = pts.filter((_, i) => i % 2 === 0)
      const ys = pts.filter((_, i) => i % 2 === 1)
      return (
        Math.min(...xs) >= 0 &&
        Math.max(...xs) <= stage.width() &&
        Math.min(...ys) >= 0 &&
        Math.max(...ys) <= stage.height()
      )
    })
    assert.ok(inside, 'every wall is on screen')
  })

  it('keeps the view across a reload', async () => {
    await app.page.click('button[title^="Zoom in"]')
    await app.reload()
    assert.equal(await app.zoomLabel(), '125%')
  })

  it('snapping distances stay the same on screen when zoomed out', async () => {
    await app.drawChain([24, 24], [96, 24])
    await app.chord('Control+-')
    await app.chord('Control+-') // 64%
    // Where the corner (96,24) is drawn now.
    const [cx, cy] = await app.page.evaluate(() =>
      (
        window.Konva.stages[0]!.getLayers()[1]!.getChildren()[0] as unknown as {
          getChildren(): { points(): number[] }[]
        }
      )
        .getChildren()[0]!
        .points()
        .slice(2, 4),
    )
    await app.tool('wall')
    await app.page.keyboard.down('Shift') // grid off: only the corner snap can make it exact
    // 8px from the corner on screen (≈3" at 64%): still inside the 10px snap radius.
    await app.page.mouse.click(...app.canvasPx(cx! + 6, cy! + 5))
    await app.page.mouse.click(...app.canvasPx(cx! + 6, cy! + 150))
    await app.page.keyboard.up('Shift')
    await app.key('Enter')
    assert.ok(
      (await app.walls()).some((w) => w.startsWith('96,24,')),
      (await app.walls()).join(' '),
    )
  })
})
