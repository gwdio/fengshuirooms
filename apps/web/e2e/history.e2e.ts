import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { useApp } from './harness.ts'

describe('undo / redo', () => {
  const app = useApp()
  beforeEach(() => app.reset())

  const undo = () => app.chord('Control+z')
  const redo = () => app.chord('Control+Shift+z')

  it('undoes and redoes wall edits step by step', async () => {
    await app.drawChain([24, 24], [96, 24], [96, 96])
    await undo()
    assert.deepEqual(await app.walls(), ['24,24,96,24'])
    await undo()
    assert.deepEqual(await app.walls(), [])
    await redo()
    assert.deepEqual(await app.walls(), ['24,24,96,24'])
    await app.chord('Control+y')
    assert.deepEqual(await app.walls(), ['24,24,96,24', '96,24,96,96'])
  })

  it('undoes a drag as one step, restoring merged and split walls exactly', async () => {
    await app.drawChain([12, 96], [96, 96])
    await app.drawChain([72, 120], [144, 120])
    await app.key('v')
    await app.drag(108, 120, 108, 96) // merges into one wall
    assert.deepEqual(await app.walls(), ['12,96,144,96'])
    await undo()
    assert.deepEqual(await app.walls(), ['12,96,96,96', '72,120,144,120'])
    await app.assertHandlesOnCorners()
    await redo()
    assert.deepEqual(await app.walls(), ['12,96,144,96'])
  })

  it('a new edit clears redo', async () => {
    await app.drawChain([24, 24], [96, 24])
    await undo()
    await app.drawChain([24, 48], [96, 48])
    await redo()
    assert.deepEqual(await app.walls(), ['24,48,96,48'])
  })

  it('toolbar buttons reflect what can be undone and do the same thing', async () => {
    const disabled = (name: string) =>
      app.page.$eval(`button[title*="${name}"]`, (b) => (b as HTMLButtonElement).disabled)
    assert.equal(await disabled('Nothing to undo'), true)
    await app.drawChain([24, 24], [96, 24])
    await app.page.click('button[title^="Undo Add wall"]')
    assert.deepEqual(await app.walls(), [])
    await app.page.click('button[title^="Redo Add wall"]')
    assert.deepEqual(await app.walls(), ['24,24,96,24'])
  })

  it('undo mid-chain ends the chain instead of drawing from a removed corner', async () => {
    await app.key('w')
    await app.click(24, 24)
    await app.click(96, 24)
    await undo()
    await app.click(96, 96) // starts a new chain: no wall
    assert.deepEqual(await app.walls(), [])
  })

  it('undone state is saved; history itself starts fresh after a reload', async () => {
    await app.drawChain([24, 24], [96, 24], [96, 96])
    await undo()
    await app.reload()
    assert.deepEqual(await app.walls(), ['24,24,96,24'])
    await undo()
    assert.deepEqual(await app.walls(), ['24,24,96,24'])
  })
})
