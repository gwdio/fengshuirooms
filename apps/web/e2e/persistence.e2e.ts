import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { useApp } from './harness.ts'

describe('persistence', () => {
  const app = useApp()
  beforeEach(() => app.reset())

  it('keeps walls across a reload, even straight after an edit', async () => {
    await app.drawChain([24, 24], [96, 24], [96, 96])
    await app.reload() // no wait: relies on the save-on-pagehide flush
    assert.deepEqual(await app.walls(), ['24,24,96,24', '96,24,96,96'])
  })

  it('keeps edits made after a reload', async () => {
    await app.drawChain([24, 24], [96, 24])
    await app.reload()
    await app.key('v')
    await app.drag(96, 24, 96, 60)
    await app.reload()
    assert.deepEqual(await app.walls(), ['24,24,96,60'])
  })

  it('keeps the units setting and the grid snap preference', async () => {
    await app.page.click('button[title="Units"]') // units toggle
    await app.key('g')
    await app.drawChain([24, 24], [96, 24])
    await app.reload()
    assert.match(await app.gridLabel(), /off/)
    assert.match((await app.page.$eval('button[title="Units"]', (b) => b.textContent)) ?? '', /m/)
  })

  it('starts fresh with a notice when the saved plan is unreadable, leaving the data alone', async () => {
    await app.drawChain([24, 24], [96, 24])
    await app.reload()
    const id = (await app.storage('activeDocId'))!
    await app.setStorage(`doc:${id}`, '{garbage')
    await app.reload()
    assert.match((await app.notice()) ?? '', /Couldn't open your last plan/)
    assert.deepEqual(await app.walls(), [])
    await app.drawChain([24, 48], [96, 48])
    await app.reload()
    assert.equal(await app.storage(`doc:${id}`), '{garbage')
  })

  it('loads the good walls from a partly damaged save', async () => {
    await app.drawChain([24, 24], [96, 24], [96, 96])
    await app.reload()
    const id = (await app.storage('activeDocId'))!
    const snap = JSON.parse((await app.storage(`doc:${id}`))!)
    snap.collections.walls.entities[0].start = 'nowhere'
    await app.setStorage(`doc:${id}`, JSON.stringify(snap))
    await app.reload()
    assert.equal((await app.walls()).length, 1)
    assert.match((await app.notice()) ?? '', /1 damaged walls entry was removed/)
  })
})
