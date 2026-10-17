import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { useApp } from './harness.ts'

describe('keyboard', () => {
  const app = useApp()
  beforeEach(() => app.reset())

  it('switches tools with W and V', async () => {
    assert.match(await app.pressed(), /Select/)
    await app.key('w')
    assert.match(await app.pressed(), /Wall/)
    await app.key('v')
    assert.match(await app.pressed(), /Select/)
  })

  it('still works after clicking the canvas or a toolbar button', async () => {
    await app.click(100, 100)
    await app.key('w')
    assert.match(await app.pressed(), /Wall/)
    await app.page.click('button[title^="Select"]')
    await app.key('w')
    await app.key('v')
    assert.match(await app.pressed(), /Select/)
  })

  it('handles rapid switching', async () => {
    for (const k of ['w', 'v', 'w', 'v', 'w']) await app.key(k)
    assert.match(await app.pressed(), /Wall/)
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
    await app.key('w')
    await app.click(24, 24)
    await app.key('Escape')
    assert.match(await app.pressed(), /Wall/)
    await app.key('Escape')
    assert.match(await app.pressed(), /Select/)
  })
})
