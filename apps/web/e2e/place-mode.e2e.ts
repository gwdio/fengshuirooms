import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { useApp } from './harness.ts'

describe('place mode (P) and Up/Down element switching', () => {
  const app = useApp()
  beforeEach(() => app.reset())

  it('P picks the wall tool when nothing has been used yet', async () => {
    await app.key('p')
    assert.match(await app.pressed(), /Wall/)
  })

  it('P returns to the last element picked from the panel', async () => {
    await app.tool('door')
    await app.key('v')
    assert.match(await app.pressed(), /Select/)
    await app.key('p')
    assert.match(await app.pressed(), /Door/)
  })

  it('dragging an element in counts as using it', async () => {
    await app.drawChain([12, 96], [132, 96])
    await app.key('v')
    await app.dropFromPanel('window', 70, 98)
    await app.key('p')
    assert.match(await app.pressed(), /Window/)
  })

  it('Up/Down cycle through the elements, wrapping around', async () => {
    await app.tool('wall')
    await app.key('ArrowDown')
    assert.match(await app.pressed(), /Door/)
    await app.key('ArrowDown')
    assert.match(await app.pressed(), /Window/)
    await app.key('ArrowDown')
    assert.match(await app.pressed(), /Wall/)
    await app.key('ArrowUp')
    assert.match(await app.pressed(), /Window/)
  })

  it('from Select, Up/Down go back to the last used element like P', async () => {
    await app.tool('window')
    await app.key('v')
    await app.key('ArrowDown')
    assert.match(await app.pressed(), /Window/)
  })

  it('remembers the last used element across reloads', async () => {
    await app.tool('door')
    await app.key('v')
    await app.reload()
    await app.key('p')
    assert.match(await app.pressed(), /Door/)
  })

  it('switching away mid-chain keeps the walls drawn so far', async () => {
    await app.tool('wall')
    await app.click(24, 24)
    await app.click(96, 24)
    await app.key('ArrowDown') // to Door
    await app.key('ArrowUp') // back to Wall: a new chain
    await app.click(96, 96)
    assert.deepEqual(await app.walls(), ['24,24,96,24'])
  })

  it('the toolbar has Select and Place tools; Place shows what it will place', async () => {
    const label = (id: string) =>
      app.page.$eval(`[data-tool="${id}"]`, (b) => b.textContent?.trim() ?? '')
    const active = (id: string) =>
      app.page.$eval(`[data-tool="${id}"]`, (b) => b.getAttribute('aria-pressed'))
    assert.match(await label('place'), /Place · Wall/)
    await app.tool('window')
    assert.equal(await active('place'), 'true') // any element tool counts as Place
    assert.equal(await active('select'), 'false')
    await app.page.click('[data-tool="select"]')
    assert.match(await label('place'), /Place · Window/)
    await app.page.click('[data-tool="place"]')
    assert.match(await app.pressed(), /Window/)
    assert.equal(await active('place'), 'true')
  })
})
