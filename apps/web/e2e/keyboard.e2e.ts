import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { useApp } from './harness.ts'

describe('keyboard', () => {
  const app = useApp()
  beforeEach(() => app.reset())

  it('V returns to Select from any tool; W/D/N are not shortcuts', async () => {
    assert.match(await app.pressed(), /Select/)
    for (const k of ['w', 'd', 'n']) await app.key(k)
    assert.match(await app.pressed(), /Select/)
    await app.tool('wall')
    assert.match(await app.pressed(), /Wall/)
    await app.key('v')
    assert.match(await app.pressed(), /Select/)
  })

  it('still works after clicking the canvas, a toolbar button, or the panel', async () => {
    await app.click(100, 100)
    await app.tool('door')
    assert.match(await app.pressed(), /Door/)
    await app.page.click('button[title^="Select"]')
    await app.tool('window')
    await app.key('v')
    assert.match(await app.pressed(), /Select/)
  })

  it('toggles grid snap with G and inverts it while Shift is held', async () => {
    assert.match(await app.gridLabel(), /on/)
    await app.key('g')
    assert.match(await app.gridLabel(), /off/)
    await app.key('g')
    await app.page.keyboard.down('Shift')
    assert.match(await app.gridLabel(), /off/)
    await app.page.keyboard.up('Shift')
    assert.match(await app.gridLabel(), /on/)
  })

  it('Escape ends a chain first, then leaves the wall tool', async () => {
    await app.tool('wall')
    await app.click(24, 24)
    await app.key('Escape')
    assert.match(await app.pressed(), /Wall/)
    await app.key('Escape')
    assert.match(await app.pressed(), /Select/)
  })
})
