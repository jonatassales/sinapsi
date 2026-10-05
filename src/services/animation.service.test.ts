import { DEFAULT_SINAPSI_PALETTE } from '@core/config.data'
import type { FrameCallback } from '@domain/kernel/motion.types'
import type { SinapsiGraphDocument } from '@domain/kernel/nodes.types'
import type { SinapsiProperties } from '@domain/kernel/properties.types'
import type { RenderFrame } from '@domain/kernel/render.types'
import { GraphAnimationService } from '@services/animation.service'
import { CanvasRendererService } from '@services/renderer.service'
import { GraphSceneService } from '@services/scene.service'
import { describe, expect, it, vi } from 'vitest'

describe('service/animation', () => {
  it('skips scene advance while frozen', () => {
    const advance = vi.spyOn(GraphSceneService.prototype, 'advance')
    let tick: FrameCallback = () => undefined
    const canvas = document.createElement('canvas')
    Object.defineProperty(canvas, 'clientWidth', { value: 200 })
    Object.defineProperty(canvas, 'clientHeight', { value: 200 })

    const properties: SinapsiProperties = {
      palette: DEFAULT_SINAPSI_PALETTE,
      move: 'rotate',
      speed: 1,
      generatedNodes: 12,
      semanticNodes: null
    }

    const service = new GraphAnimationService(canvas, properties, {
      loop: {
        schedule(callback) {
          tick = callback
        },
        cancel() {}
      },
      tween: () => ({ stop() {} })
    })

    service.start()
    tick({ delta: 16 })
    expect(advance).toHaveBeenCalled()

    service.setFrozen(true)
    advance.mockClear()
    tick({ delta: 16 })
    expect(advance).not.toHaveBeenCalled()
    service.dispose()
  })

  it('previews exactly one neighborhood while retaining a separate semantic selection', () => {
    const audit = animationFixture()
    audit.service.selectNode('a')
    audit.service.setHoverId('d')
    audit.tick()
    expect(audit.latest().activeId).toBe('d')
    expect(
      audit
        .latest()
        .nodes.filter((node) => node.emphasized)
        .map((node) => node.id)
    ).toEqual(['c', 'd'])
    expect(audit.latest().nodes.find((node) => node.id === 'a')).toMatchObject({
      selected: true,
      emphasized: false,
      labeled: false
    })

    audit.service.setHoverId(null)
    audit.service.setFocusedId('b')
    audit.tick()
    expect(audit.latest().activeId).toBe('b')
    expect(audit.latest().nodes.find((node) => node.id === 'b')?.focused).toBe(true)
    audit.service.setFocusedId(null)
    audit.tick()
    expect(audit.latest().activeId).toBe('a')
    expect(audit.latest().nodes.every((node) => !node.labeled)).toBe(true)
    audit.service.selectNode(null)
    audit.tick()
    expect(audit.latest().activeId).toBe(null)
    expect(audit.latest().nodes.every((node) => !node.selected)).toBe(true)
    audit.service.dispose()
  })

  it('preserves legacy labels but never enlarges discs for presentation activation', () => {
    const audit = animationFixture()
    audit.service.activateNeighborhood('a')
    audit.tick()
    expect(
      audit
        .latest()
        .nodes.filter((node) => node.labeled)
        .map((node) => node.id)
    ).toEqual(['a', 'b', 'c'])
    audit.service.setHoverId('d')
    audit.tick()
    expect(audit.latest().nodes.every((node) => !node.labeled)).toBe(true)
    audit.service.setHoverId(null)
    audit.service.apply({
      ...audit.properties,
      semanticNodes: {
        graph: triangle.graph.map((node) =>
          node.id === 'a' ? { ...node, presentation: { type: 'card', title: 'Details' } } : node
        )
      }
    })
    audit.service.activateNeighborhood('a')
    audit.tick()
    expect(audit.latest().nodes.find((node) => node.id === 'a')?.selected).toBe(true)
    expect(audit.latest().nodes.every((node) => !node.labeled)).toBe(true)
    audit.service.dispose()
  })

  it('keeps positions and selection for label, payload, presentation and document-order updates', () => {
    const replace = vi.spyOn(GraphSceneService.prototype, 'replaceGraph')
    const audit = animationFixture()
    audit.service.setFrozen(true)
    audit.service.selectNode('a')
    audit.service.setFocusedId('b')
    audit.tick()
    const before = audit.latest().nodes.map(({ id, x, y, depth }) => ({ id, x, y, depth }))
    audit.service.apply({
      ...audit.properties,
      semanticNodes: {
        graph: [...triangle.graph].reverse().map((node) => ({
          ...node,
          name: `Translated ${node.id}`,
          payload: { revision: 2 },
          links: node.links.map((link) => ({ ...link, name: 'Localized edge metadata' })),
          presentation: { type: 'tooltip', description: `Updated ${node.id}` }
        }))
      }
    })
    expect(replace).not.toHaveBeenCalled()
    expect(audit.latest().nodes.map(({ id, x, y, depth }) => ({ id, x, y, depth }))).toEqual(before)
    expect(audit.latest().nodes.find((node) => node.id === 'a')).toMatchObject({
      selected: true,
      name: 'Translated a'
    })
    expect(audit.latest().nodes.find((node) => node.id === 'b')?.focused).toBe(true)
    audit.service.dispose()
  })

  it('rebuilds for changed connections and reconciles removed selection and focus', () => {
    const replace = vi.spyOn(GraphSceneService.prototype, 'replaceGraph')
    const audit = animationFixture()
    audit.service.selectNode('a')
    audit.service.setFocusedId('a')
    audit.service.setHoverId('a')
    audit.service.apply({
      ...audit.properties,
      semanticNodes: { graph: triangle.graph.filter((node) => node.id !== 'a') }
    })
    expect(replace).toHaveBeenCalledTimes(1)
    expect(audit.latest().activeId).toBe(null)
    expect(audit.latest().nodes.every((node) => !node.selected && !node.focused)).toBe(true)
    audit.service.dispose()
  })

  it('does not render recurring frozen ticks; reports invalidated frames after resize and interaction', () => {
    const audit = animationFixture()
    audit.service.setFrozen(true)
    const listener = vi.fn((frame: RenderFrame) => {
      expect(audit.render).toHaveBeenLastCalledWith(frame, audit.properties.palette)
    })
    audit.service.setFrameListener(listener)
    audit.tick()
    audit.tick()
    expect(listener).not.toHaveBeenCalled()
    audit.service.resize()
    expect(listener).toHaveBeenCalledTimes(1)
    audit.service.setHoverId('a')
    expect(listener).toHaveBeenCalledTimes(2)
    audit.service.apply({ ...audit.properties, activeNodeIds: ['d'] })
    expect(listener).toHaveBeenCalledTimes(3)
    audit.service.setFrameListener(null)
    audit.tick()
    expect(listener).toHaveBeenCalledTimes(3)
    audit.service.dispose()
    expect(audit.cancel).toHaveBeenCalledTimes(1)
    expect(audit.stopReveal).toHaveBeenCalledTimes(1)
  })

  it('has no recurring frame or reveal tween when initially reduced, and resumes exactly once', () => {
    const schedule = vi.fn(),
      cancel = vi.fn(),
      tween = vi.fn(() => ({ stop: vi.fn() }))
    const service = new GraphAnimationService(
      document.createElement('canvas'),
      {
        palette: DEFAULT_SINAPSI_PALETTE,
        move: 'rotate',
        speed: 1,
        generatedNodes: 12,
        semanticNodes: triangle
      },
      { loop: { schedule, cancel }, tween }
    )
    service.setFrozen(true)
    service.start()
    expect(schedule).not.toHaveBeenCalled()
    expect(tween).not.toHaveBeenCalled()
    service.setFrozen(false)
    service.setFrozen(false)
    expect(schedule).toHaveBeenCalledTimes(1)
    service.setFrozen(true)
    expect(cancel).toHaveBeenCalledTimes(1)
    service.setFrozen(false)
    expect(schedule).toHaveBeenCalledTimes(2)
    service.dispose()
    expect(cancel).toHaveBeenCalledTimes(2)
  })

  it('programmatic activation preserves live movement and highlights exact IDs', () => {
    const audit = animationFixture()
    audit.service.apply({ ...audit.properties, activeNodeIds: ['a', 'd'] })
    const before = audit.latest().nodes.map(({ x, y }) => ({ x, y }))
    audit.tick()
    expect(audit.latest().nodes.map(({ x, y }) => ({ x, y }))).not.toEqual(before)
    expect(
      audit
        .latest()
        .nodes.filter((node) => node.emphasized)
        .map((node) => node.id)
    ).toEqual(['a', 'd'])
    expect(audit.latest().nodes.every((node) => !node.labeled && !node.selected)).toBe(true)
    audit.service.dispose()
  })

  it('reconnects fully revealed when disposed during the initial reveal tween', () => {
    const audit = animationFixture()
    expect(audit.latest().reveal).toBeLessThan(1)
    audit.service.dispose()
    let reconnected: RenderFrame | undefined
    audit.service.setFrameListener((frame) => {
      reconnected = frame
    })
    audit.service.start()
    expect(reconnected?.reveal).toBe(1)
    audit.service.dispose()
  })
})

const triangle: SinapsiGraphDocument = {
  graph: [
    {
      id: 'a',
      name: 'A',
      payload: {},
      links: [
        { id: 'b', name: 'B' },
        { id: 'c', name: 'C' }
      ]
    },
    { id: 'b', name: 'B', payload: {}, links: [{ id: 'c', name: 'C' }] },
    { id: 'c', name: 'C', payload: {}, links: [{ id: 'd', name: 'D' }] },
    { id: 'd', name: 'D', payload: {}, links: [] }
  ]
}

function animationFixture() {
  let tick: FrameCallback = () => undefined
  const frames: RenderFrame[] = []
  const render = vi
    .spyOn(CanvasRendererService.prototype, 'render')
    .mockImplementation(() => undefined)
  const cancel = vi.fn()
  const stopReveal = vi.fn()
  const canvas = document.createElement('canvas')
  Object.defineProperties(canvas, { clientWidth: { value: 200 }, clientHeight: { value: 200 } })
  const properties: SinapsiProperties = {
    palette: DEFAULT_SINAPSI_PALETTE,
    move: 'rotate',
    speed: 1,
    generatedNodes: 12,
    semanticNodes: triangle
  }
  const service = new GraphAnimationService(canvas, properties, {
    loop: {
      schedule: (callback) => {
        tick = callback
      },
      cancel
    },
    tween: () => ({ stop: stopReveal })
  })
  service.setFrameListener((frame) => {
    frames.push(frame)
  })
  service.start()
  return {
    service,
    properties,
    render,
    cancel,
    stopReveal,
    tick: () => tick({ delta: 16 }),
    latest: () => frames[frames.length - 1]
  }
}
