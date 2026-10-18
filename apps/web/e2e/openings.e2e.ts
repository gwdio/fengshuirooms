import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { useApp } from './harness.ts'

describe('doors and windows', () => {
  const app = useApp()
  beforeEach(async () => {
    await app.reset()
    await app.drawChain([12, 96], [132, 96]) // a 10' wall
  })

  it('a door dropped on a wall splits it into wall | door | wall', async () => {
    await app.tool('door')
    await app.click(70, 97)
    assert.deepEqual(await app.segments(), [
      'door:54,96,90,96',
      'wall:12,96,54,96',
      'wall:90,96,132,96',
    ])
    await app.key('Escape')
    assert.match(await app.pressed(), /Select/)
    await app.assertHandlesOnCorners()
  })

  it('fits the opening inside the wall near an end, and ignores walls too short', async () => {
    await app.tool('window')
    await app.click(15, 96)
    assert.deepEqual(await app.segments(), ['wall:48,96,132,96', 'window:12,96,48,96'])
    await app.drawChain([12, 144], [36, 144]) // 2', shorter than a 3' window
    await app.tool('window')
    await app.click(24, 144)
    assert.ok((await app.segments()).includes('wall:12,144,36,144'))
  })

  it('deleting a door turns it back into wall, rejoining the wall', async () => {
    await app.tool('door')
    await app.click(72, 96)
    await app.key('v')
    await app.click(72, 96)
    assert.match(await app.selectionLabel(), /Door/)
    await app.key('Delete')
    assert.deepEqual(await app.segments(), ['wall:12,96,132,96'])
  })

  it('undo removes a placed door in one step', async () => {
    await app.tool('wall')
    await app.tool('window')
    await app.click(72, 96)
    await app.chord('Control+z')
    assert.deepEqual(await app.segments(), ['wall:12,96,132,96'])
  })

  it('dragging a door slides it along its wall and stops at the end', async () => {
    await app.tool('door')
    await app.click(72, 96)
    await app.key('v')
    await app.drag(72, 96, 96, 110) // perpendicular part is ignored
    assert.deepEqual(await app.segments(), [
      'door:78,96,114,96',
      'wall:114,96,132,96',
      'wall:12,96,78,96',
    ])
    await app.drag(96, 96, 200, 96) // well past the end of the wall, still on the canvas
    assert.ok((await app.segments()).includes('door:96,96,132,96'))
    await app.assertHandlesOnCorners()
  })

  it("dragging a door's corner resizes it along the wall instead of bending it", async () => {
    await app.tool('door')
    await app.click(72, 96)
    await app.key('v')
    await app.drag(90, 96, 100, 120) // snaps to x=96; the y part is ignored
    assert.deepEqual(await app.segments(), [
      'door:54,96,96,96',
      'wall:12,96,54,96',
      'wall:96,96,132,96',
    ])
  })

  it('door hinge and swing flips are saved', async () => {
    await app.tool('door')
    await app.click(72, 96)
    await app.key('v')
    await app.click(72, 96)
    await app.page.click('xpath/.//button[text()="Flip swing"]')
    await app.page.click('xpath/.//button[text()="Flip hinge"]')
    await app.reload()
    const id = (await app.storage('activeDocId'))!
    const snap = JSON.parse((await app.storage(`doc:${id}`))!)
    const door = snap.collections.walls.entities.find((w: { kind: string }) => w.kind === 'door')
    assert.equal(door.swing, 'right')
    assert.equal(door.hinge, 'end')
    assert.equal(snap.collections.walls.version, 2)
  })

  it('a wall drawn from a door does not cut the door', async () => {
    await app.tool('door')
    await app.click(72, 96)
    await app.drawChain([72, 96], [72, 150])
    assert.ok((await app.segments()).includes('door:54,96,90,96'))
  })

  it('loads plans saved before doors existed (walls collection v1)', async () => {
    const v1 = {
      format: 1,
      collections: {
        walls: {
          version: 1,
          entities: [{ id: 'old', start: { x: 0, y: 24 }, end: { x: 96, y: 24 }, thickness: 4.5 }],
        },
      },
    }
    await app.reload() // let the current plan's save-on-close happen first
    await app.setStorage('doc:legacy', JSON.stringify(v1))
    await app.setStorage('activeDocId', 'legacy')
    await app.reload()
    assert.deepEqual(await app.segments(), ['wall:0,24,96,24'])
    assert.equal(await app.notice(), null)
  })
})
