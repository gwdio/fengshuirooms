import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { useApp } from './harness.ts'

describe('wall dragging, detaching, splitting, merging', () => {
  const app = useApp()
  beforeEach(() => app.reset())

  async function drawL() {
    await app.drawChain([24, 24], [96, 24], [96, 96])
    await app.key('v')
  }

  it('dragging a selected wall moves only it', async () => {
    await drawL()
    await app.click(96, 60)
    assert.match(await app.selectionLabel(), /1 selected/)
    await app.drag(96, 60, 120, 60)
    assert.deepEqual(await app.walls(), ['120,24,120,96', '24,24,96,24'])
    await app.assertHandlesOnCorners()
  })

  it('dragging an unselected wall selects and moves it (splitting what it lands on)', async () => {
    await drawL()
    await app.drag(60, 24, 60, 48)
    assert.deepEqual(await app.walls(), ['24,48,96,48', '96,24,96,48', '96,48,96,96'])
    assert.match(await app.selectionLabel(), /1 selected/)
  })

  it("a selected wall's corner detaches; an unselected corner moves everything", async () => {
    await drawL()
    await app.click(96, 60)
    await app.drag(96, 24, 120, 12)
    assert.deepEqual(await app.walls(), ['120,12,96,96', '24,24,96,24'])
    await app.assertHandlesOnCorners()
    await app.click(5, 200) // deselect
    await app.drag(96, 24, 96, 36) // the corner left behind is still grabbable in place
    assert.deepEqual(await app.walls(), ['120,12,96,96', '24,24,96,36'])
  })

  it('a junction becomes a normal corner', async () => {
    await drawL()
    await app.drawChain([60, 25], [60, 72])
    assert.deepEqual(await app.walls(), [
      '24,24,60,24',
      '60,24,60,72',
      '60,24,96,24',
      '96,24,96,96',
    ])
    await app.key('v')
    await app.drag(60, 24, 60, 12)
    assert.deepEqual(await app.walls(), [
      '24,24,60,12',
      '60,12,60,72',
      '60,12,96,24',
      '96,24,96,96',
    ])
  })

  it('a corner dropped on a wall face splits that wall', async () => {
    await drawL()
    await app.drawChain([48, 72], [72, 72])
    await app.key('v')
    await app.drag(72, 72, 95, 72)
    assert.deepEqual(await app.walls(), [
      '24,24,96,24',
      '48,72,96,72',
      '96,24,96,72',
      '96,72,96,96',
    ])
    await app.assertHandlesOnCorners()
  })

  it('a dragged wall end snaps onto a nearby corner', async () => {
    await drawL()
    await app.drawChain([24, 120], [60, 120])
    await app.key('v')
    await app.page.keyboard.down('Shift') // grid off, so only the corner snap can make it exact
    await app.drag(40, 120, 75.5, 95.75)
    await app.page.keyboard.up('Shift')
    assert.ok((await app.walls()).includes('60,96,96,96'), (await app.walls()).join(' '))
  })

  it('detaching a stub re-merges the wall it split, with no stray handle (regression)', async () => {
    await app.drawChain([12, 24], [132, 24])
    await app.drawChain([60, 25], [60, 72])
    assert.deepEqual(await app.walls(), ['12,24,60,24', '60,24,132,24', '60,24,60,72'])
    await app.key('v')
    await app.click(60, 50)
    await app.drag(60, 24, 48, 36)
    assert.deepEqual(await app.walls(), ['12,24,132,24', '48,36,60,72'])
    await app.assertHandlesOnCorners()
    await app.drag(55, 54, 67, 54)
    assert.deepEqual(await app.walls(), ['12,24,132,24', '60,36,72,72'])
    await app.assertHandlesOnCorners()
    const before = await app.walls()
    await app.drag(48, 36, 48, 48) // where the stale handle used to be
    assert.deepEqual(await app.walls(), before)
  })

  it('a wall dragged end-to-end with an inline wall merges with it', async () => {
    await app.drawChain([12, 96], [96, 96])
    await app.drawChain([120, 96], [156, 96])
    await app.key('v')
    await app.drag(140, 96, 116, 96)
    assert.deepEqual(await app.walls(), ['12,96,132,96'])
    await app.assertHandlesOnCorners()
  })

  it('a wall dragged onto a parallel wall merges into one spanning both', async () => {
    await app.drawChain([12, 96], [96, 96])
    await app.drawChain([72, 120], [144, 120])
    await app.key('v')
    await app.drag(108, 120, 108, 96)
    assert.deepEqual(await app.walls(), ['12,96,144,96'])
    await app.assertHandlesOnCorners()
    assert.match(await app.selectionLabel(), /1 selected/) // selection follows the merge
  })

  it('a parallel wall dropped near (grid off) snaps exactly onto the line and merges', async () => {
    await app.drawChain([12, 96], [96, 96])
    await app.drawChain([24, 120], [60, 120])
    await app.key('v')
    await app.page.keyboard.down('Shift')
    await app.drag(40, 120, 40.5, 97.25) // lands ~1.25" off the line
    await app.page.keyboard.up('Shift')
    assert.deepEqual(await app.walls(), ['12,96,96,96'])
  })

  it('a wall dropped on top of a wall that has a junction keeps the junction as a corner', async () => {
    await app.drawChain([12, 96], [132, 96])
    await app.drawChain([60, 97], [60, 144]) // stub splits the long wall at x=60
    await app.drawChain([24, 60], [48, 60])
    await app.key('v')
    await app.drag(36, 60, 36, 96) // onto the left piece
    assert.deepEqual(await app.walls(), ['12,96,60,96', '60,96,132,96', '60,96,60,144'])
  })
})
