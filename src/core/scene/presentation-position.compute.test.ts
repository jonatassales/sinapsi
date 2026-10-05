import { describe, expect, it } from 'vitest'
import {
  containsPoint,
  intersectBounds,
  positionPresentation
} from './presentation-position.compute'

describe('core/presentation-position', () => {
  const bounds = { left: 8, top: 8, right: 992, bottom: 692 }
  const size = { width: 340, height: 180 }

  it('tracks the node in CSS coordinates and flips near the right edge', () => {
    const first = positionPresentation({ x: 300, y: 220 }, size, bounds)
    const moved = positionPresentation({ x: 340, y: 250 }, size, bounds, first.side)
    expect(first.side).toBe('right')
    expect(moved.x - first.x).toBe(40)
    expect(moved.y - first.y).toBe(30)
    const edge = positionPresentation({ x: 950, y: 250 }, size, bounds, moved.side)
    expect(edge.side).toBe('left')
    expect(edge.x + size.width).toBeLessThan(950)
  })

  it('uses vertical room on a narrow viewport and keeps the complete panel within bounds', () => {
    const narrow = { left: 8, top: 8, right: 367, bottom: 700 }
    const result = positionPresentation({ x: 187, y: 350 }, size, narrow)
    expect(['top', 'bottom']).toContain(result.side)
    expect(result.x).toBeGreaterThanOrEqual(narrow.left)
    expect(result.x + size.width).toBeLessThanOrEqual(narrow.right)
    expect(result.y).toBeGreaterThanOrEqual(narrow.top)
    expect(result.y + size.height).toBeLessThanOrEqual(narrow.bottom)
  })

  it('does not alternate sides under small boundary oscillations', () => {
    const first = positionPresentation({ x: 635, y: 300 }, size, bounds, 'right')
    const next = positionPresentation({ x: 638, y: 300 }, size, bounds, first.side)
    expect(first.side).toBe('right')
    expect(next.side).toBe('right')
    expect(positionPresentation({ x: 660, y: 300 }, size, bounds, next.side).side).toBe('left')
  })

  it('recognizes clipped and offscreen anchors without changing selection state', () => {
    const visible = intersectBounds(bounds, { left: 100, top: -100, right: 500, bottom: 200 })
    expect(containsPoint(visible, 150, 100)).toBe(true)
    expect(containsPoint(visible, 150, -10)).toBe(false)
    expect(containsPoint(visible, 800, 100)).toBe(false)
  })
})
