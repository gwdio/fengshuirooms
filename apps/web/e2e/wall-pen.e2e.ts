import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { useApp } from './harness.ts'

describe('wall pen', () => {
  const app = useApp()
  beforeEach(() => app.reset())

  it('draws a chain of clicks on the grid and closes on the start point', async () => {
    await app.tool('wall')
    for (const [x, y] of [
      [25, 25],
      [85, 25],
      [85, 70],
      [25, 25],
    ] as const)
      await app.click(x, y)
    assert.deepEqual(await app.walls(), ['24,24,84,24', '84,24,84,72', '84,72,24,24'])
    await app.click(150, 150) // closed: this starts a new chain instead of drawing
    assert.equal((await app.walls()).length, 3)
  })

  it('draws a wall by dragging, and a following click continues from its end', async () => {
    await app.tool('wall')
    await app.drag(125, 25, 175, 25)
    assert.deepEqual(await app.walls(), ['120,24,180,24'])
    await app.click(175, 75)
    assert.deepEqual(await app.walls(), ['120,24,180,24', '180,24,180,72'])
  })

  it('Enter and double-click end the chain', async () => {
    await app.tool('wall')
    await app.click(24, 24)
    await app.click(72, 24)
    await app.key('Enter')
    await app.click(100, 60)
    assert.equal((await app.walls()).length, 1)
    await app.key('Escape')
    await app.click(24, 100)
    await app.click(72, 100)
    await app.click(72, 100) // same point again = double-click
    await app.click(100, 130) // starts a new chain rather than drawing
    assert.deepEqual(await app.walls(), ['24,24,72,24', '24,96,72,96'])
  })

  it('Backspace removes the last wall of the chain', async () => {
    await app.tool('wall')
    for (const [x, y] of [
      [24, 96],
      [72, 96],
      [72, 120],
    ] as const)
      await app.click(x, y)
    assert.equal((await app.walls()).length, 2)
    await app.key('Backspace')
    assert.deepEqual(await app.walls(), ['24,96,72,96'])
  })

  it('holding Shift places free points rounded to the inch', async () => {
    await app.tool('wall')
    await app.page.keyboard.down('Shift')
    await app.click(25.25, 150.25)
    await app.click(50.75, 150.25)
    await app.page.keyboard.up('Shift')
    assert.deepEqual(await app.walls(), ['25,150,51,150'])
  })

  it('merges collinear clicks into one wall', async () => {
    await app.drawChain([12, 96], [48, 96], [96, 96])
    assert.deepEqual(await app.walls(), ['12,96,96,96'])
  })

  it('starting a wall on another wall splits that wall', async () => {
    await app.drawChain([24, 24], [84, 24])
    await app.drag(50, 24.75, 50, 55)
    assert.deepEqual(await app.walls(), ['24,24,48,24', '48,24,48,60', '48,24,84,24'])
  })
})
