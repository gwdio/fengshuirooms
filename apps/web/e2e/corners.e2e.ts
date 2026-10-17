import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { useApp } from './harness.ts'

describe('corner dragging', () => {
  const app = useApp()
  beforeEach(async () => {
    await app.reset()
    await app.drawChain([24, 24], [96, 24], [96, 96]) // L
    await app.key('v')
  })

  it('shows handles only in the select tool', async () => {
    await app.assertHandlesOnCorners()
    await app.key('w')
    // Layers are grid, walls, then handles (select tool only). Walls are draggable too, so only
    // look past the walls layer.
    const handles = await app.page.evaluate(() =>
      window.Konva.stages[0]!.getLayers()
        .slice(2)
        .flatMap((l) => l.getChildren())
        .filter((n) => n.draggable()),
    )
    assert.equal(handles.length, 0)
  })

  it('moves every wall at a shared corner, previewing while dragging', async () => {
    await app.drag(96, 24, 120, 36)
    assert.deepEqual(await app.walls(), ['120,36,96,96', '24,24,120,36'])
    await app.assertHandlesOnCorners()
  })

  it('previews the move before release', async () => {
    const [x, y] = [24 * 4, 24 * 4]
    const origin = await app.page.evaluate(() => {
      const r = window.Konva.stages[0]!.container().getBoundingClientRect()
      return { x: r.x, y: r.y }
    })
    await app.page.mouse.move(origin.x + x, origin.y + y)
    await app.page.mouse.down()
    await app.page.mouse.move(origin.x + x, origin.y + 48 * 4, { steps: 10 })
    assert.ok((await app.walls()).includes('24,48,96,24'))
    await app.page.mouse.up()
  })

  it('uses 1" precision while Shift is held', async () => {
    await app.page.keyboard.down('Shift')
    await app.drag(24, 24, 25.25, 25.25)
    await app.page.keyboard.up('Shift')
    assert.ok((await app.walls()).includes('25,25,96,24'))
  })

  it('merges corners when dropped onto another corner', async () => {
    await app.drawChain([96, 96], [24, 96])
    await app.key('v')
    await app.drag(24, 96, 24, 24) // the U's free end onto its start: a closed triangle
    assert.deepEqual(await app.walls(), ['24,24,96,24', '96,24,96,96', '96,96,24,24'])
    await app.assertHandlesOnCorners()
  })

  it('deletes a wall that collapses to zero length', async () => {
    await app.drag(96, 24, 24, 24)
    assert.deepEqual(await app.walls(), ['24,24,96,96'])
    await app.assertHandlesOnCorners()
  })

  it('clicking a handle keeps the selection', async () => {
    await app.click(60, 24)
    assert.match(await app.selectionLabel(), /1 selected/)
    await app.click(24, 24)
    assert.match(await app.selectionLabel(), /1 selected/)
  })
})
