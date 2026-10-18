import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { useApp } from './harness.ts'

describe('elements panel: drag in and drag out', () => {
  const app = useApp()
  beforeEach(() => app.reset())

  it('clicking an entry picks its tool', async () => {
    await app.tool('wall')
    assert.match(await app.pressed(), /Wall/)
    await app.tool('door')
    assert.match(await app.pressed(), /Door/)
  })

  it('dragging Wall onto the canvas drops a selected 4′ wall at the snapped point', async () => {
    await app.dropFromPanel('wall', 61, 49)
    assert.deepEqual(await app.segments(), ['wall:36,48,84,48'])
    assert.match(await app.selectionLabel(), /1 selected/)
    assert.match(await app.pressed(), /Select/) // dropping doesn't change the tool
  })

  it('dragging Door onto a wall cuts it in; off a wall nothing happens', async () => {
    await app.drawChain([12, 96], [132, 96])
    await app.key('v')
    await app.dropFromPanel('door', 70, 98)
    assert.deepEqual(await app.segments(), [
      'door:54,96,90,96',
      'wall:12,96,54,96',
      'wall:90,96,132,96',
    ])
    await app.dropFromPanel('window', 70, 150)
    assert.equal((await app.segments()).length, 3)
  })

  it('a drop released back over the panel does nothing', async () => {
    await app.dropFromPanel('wall', -20, 40) // x<0: over the panel
    assert.deepEqual(await app.segments(), [])
  })

  it('dragging a wall off the canvas deletes it, showing the delete zone while armed', async () => {
    await app.drawChain([24, 24], [96, 24], [96, 96])
    await app.key('v')
    const origin = await app.page.evaluate(() => {
      const r = window.Konva.stages[0]!.container().getBoundingClientRect()
      return { x: r.x, y: r.y }
    })
    await app.page.mouse.move(origin.x + 60 * 4, origin.y + 24 * 4)
    await app.page.mouse.down()
    try {
      await app.page.mouse.move(origin.x - 100, origin.y + 200, { steps: 12 })
      await app.page.waitForSelector('[data-delete-zone]', { timeout: 2000 })
    } finally {
      await app.page.mouse.up()
    }
    assert.deepEqual(await app.segments(), ['wall:96,24,96,96'])
    assert.equal(await app.page.$('[data-delete-zone]'), null)
    await app.chord('Control+z')
    assert.equal((await app.segments()).length, 2)
  })

  it('dragging a door off the canvas turns it back into wall', async () => {
    await app.drawChain([12, 96], [132, 96])
    await app.tool('door')
    await app.click(72, 96)
    await app.key('v')
    await app.dragOut(72, 96)
    assert.deepEqual(await app.segments(), ['wall:12,96,132,96'])
  })

  it('dragging back onto the canvas before releasing cancels the delete', async () => {
    await app.drawChain([24, 24], [96, 24])
    await app.key('v')
    const origin = await app.page.evaluate(() => {
      const r = window.Konva.stages[0]!.container().getBoundingClientRect()
      return { x: r.x, y: r.y }
    })
    await app.page.mouse.move(origin.x + 60 * 4, origin.y + 24 * 4)
    await app.page.mouse.down()
    await app.page.mouse.move(origin.x - 100, origin.y + 100, { steps: 8 })
    await app.page.mouse.move(origin.x + 60 * 4, origin.y + 48 * 4, { steps: 8 })
    await app.page.mouse.up()
    assert.deepEqual(await app.segments(), ['wall:24,48,96,48'])
  })
})
