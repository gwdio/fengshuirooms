import { describe, expect, it } from 'vitest'
import { readSnapshot } from '../doc/snapshot.ts'
import type { Point, Wall } from './entities.ts'
import { flipDoor, openingsToWalls, placeOpening, slideOpening } from './openings.ts'
import { createWall, normalizeWalls, wallCollection } from './walls.ts'

const a = { x: 0, y: 0 }
const b = { x: 120, y: 0 }
const wall = (s: Point, e: Point) => createWall(s, e)!
const spans = (walls: readonly Wall[]) =>
  walls.map((w) => `${w.kind}:${w.start.x},${w.start.y}-${w.end.x},${w.end.y}`)

describe('placeOpening', () => {
  it('cuts the host into wall | door | wall around the point', () => {
    const host = wall(a, b)
    const out = placeOpening([host], host.id, { x: 60, y: 3 }, 'door')!
    expect(spans(out)).toEqual(['wall:0,0-42,0', 'door:42,0-78,0', 'wall:78,0-120,0'])
    expect(out[0]!.id).toBe(host.id)
    expect(out[1]).toMatchObject({ hinge: 'start', swing: 'left', thickness: host.thickness })
  })

  it('slides the opening inward to fit near an end, leaving no zero-length piece', () => {
    const host = wall(a, b)
    expect(spans(placeOpening([host], host.id, { x: 5, y: 0 }, 'window')!)).toEqual([
      'window:0,0-36,0',
      'wall:36,0-120,0',
    ])
  })

  it('refuses hosts that are too short or not plain walls', () => {
    const short = wall(a, { x: 30, y: 0 })
    expect(placeOpening([short], short.id, a, 'door')).toBeUndefined()
    const host = wall(a, b)
    const withDoor = placeOpening([host], host.id, { x: 60, y: 0 }, 'door')!
    expect(placeOpening(withDoor, withDoor[1]!.id, { x: 60, y: 0 }, 'window')).toBeUndefined()
  })

  it('works on diagonal walls with shared exact corners', () => {
    const host = wall(a, { x: 90, y: 120 }) // length 150
    const out = placeOpening([host], host.id, { x: 45, y: 60 }, 'door')!
    expect(out).toHaveLength(3)
    expect(out[0]!.end).toEqual(out[1]!.start)
    expect(out[1]!.end).toEqual(out[2]!.start)
  })
})

describe('normalization with openings', () => {
  const placed = () => {
    const host = wall(a, b)
    return placeOpening([host], host.id, { x: 60, y: 0 }, 'door')!
  }

  it('keeps wall | door | wall apart (openings never merge)', () => {
    const out = placed()
    expect(normalizeWalls(out).walls).toBe(out)
  })

  it('never splits an opening at a junction', () => {
    const out = [...placed(), wall({ x: 60, y: 0 }, { x: 60, y: 50 })]
    expect(spans(normalizeWalls(out).walls)).toContain('door:42,0-78,0')
  })

  it('does not merge a wall lying over an opening', () => {
    const out = [...placed(), wall({ x: 40, y: 0 }, { x: 80, y: 0 })]
    expect(normalizeWalls(out).walls).toHaveLength(4)
  })
})

describe('removing an opening', () => {
  it('turns it back into wall, and normalization rejoins the pieces', () => {
    const host = wall(a, b)
    const out = placeOpening([host], host.id, { x: 60, y: 0 }, 'door')!
    const { walls } = normalizeWalls(openingsToWalls(out, [out[1]!.id]))
    expect(spans(walls)).toEqual(['wall:0,0-120,0'])
    expect(walls[0]).not.toHaveProperty('hinge')
  })
})

describe('slideOpening', () => {
  it('moves the opening along its wall, keeping id and door settings', () => {
    const host = wall(a, b)
    let out = placeOpening([host], host.id, { x: 60, y: 0 }, 'door')!
    const doorId = out[1]!.id
    out = flipDoor(out, doorId, 'swing')
    const slid = slideOpening(out, doorId, { x: 30, y: 10 })!
    expect(spans(slid)).toEqual(['wall:0,0-12,0', 'door:12,0-48,0', 'wall:48,0-120,0'])
    expect(slid.find((w) => w.kind === 'door')).toMatchObject({ id: doorId, swing: 'right' })
    expect(new Set(slid.map((w) => w.id)).size).toBe(3)
  })

  it('stops at the end of the wall', () => {
    const host = wall(a, b)
    const out = placeOpening([host], host.id, { x: 60, y: 0 }, 'window')!
    expect(spans(slideOpening(out, out[1]!.id, { x: 500, y: 0 })!)).toEqual([
      'wall:0,0-84,0',
      'window:84,0-120,0',
    ])
  })
})

describe('flipDoor', () => {
  it('flips hinge and swing, and ignores windows', () => {
    const host = wall(a, b)
    const out = placeOpening([host], host.id, { x: 60, y: 0 }, 'door')!
    const id = out[1]!.id
    expect(flipDoor(out, id, 'hinge')[1]).toMatchObject({ hinge: 'end', swing: 'left' })
    expect(flipDoor(out, id, 'swing')[1]).toMatchObject({ hinge: 'start', swing: 'right' })
    const win = placeOpening([host], host.id, { x: 60, y: 0 }, 'window')!
    expect(flipDoor(win, win[1]!.id, 'hinge')).toEqual(win)
  })
})

describe('walls collection v2', () => {
  it('migrates v1 walls (no kind) to plain walls', () => {
    const v1 = { id: 'w', start: a, end: b, thickness: 4.5 }
    const read = readSnapshot(
      { format: 1, collections: { walls: { version: 1, entities: [v1] } } },
      [wallCollection],
    )
    expect(read.problems).toEqual([])
    expect(read.collections.walls).toEqual({ w: { ...v1, kind: 'wall' } })
  })

  it('defaults missing door settings and rejects unknown kinds', () => {
    const door = { id: 'd', kind: 'door', start: a, end: b, thickness: 4.5 }
    expect(wallCollection.parse(door)).toMatchObject({ hinge: 'start', swing: 'left' })
    expect(wallCollection.parse({ ...door, kind: 'portal' })).toBeUndefined()
  })
})
