import { DEFAULT_SINAPSI_PALETTE } from '@core/config.data'
import type { RenderFrame } from '@domain/kernel/render.types'
import { CanvasRendererService } from '@services/renderer.service'
import { afterEach, describe, expect, it, vi } from 'vitest'

const palette = DEFAULT_SINAPSI_PALETTE

const labeledFrame: RenderFrame = {
  nodes: [
    {
      id: 'pricing',
      name: 'Pricing',
      x: 80,
      y: 90,
      depth: 0.4,
      weight: 0.8,
      lit: 1,
      emphasized: true,
      dimmed: false,
      focused: false,
      selected: false,
      labeled: true
    },
    {
      id: 'search',
      name: 'Search',
      x: 140,
      y: 90,
      depth: 0.5,
      weight: 0.3,
      lit: 0.45,
      emphasized: true,
      dimmed: false,
      focused: false,
      selected: false,
      labeled: false
    }
  ],
  edges: [{ source: 0, target: 1 }],
  activeId: 'pricing',
  reveal: 1,
  pulse: 0
}

function fakeContext() {
  return {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 48 })),
    font: '',
    lineCap: 'butt',
    lineJoin: 'miter',
    lineWidth: 1,
    strokeStyle: '',
    fillStyle: '',
    globalAlpha: 1,
    shadowColor: '',
    shadowBlur: 0,
    textAlign: 'start' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline
  }
}

describe('service/renderer', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('paints click names inside discs and never strokes node circles', () => {
    const ctx = fakeContext()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D
    )
    const canvas = document.createElement('canvas')
    Object.defineProperty(canvas, 'clientWidth', { value: 200 })
    Object.defineProperty(canvas, 'clientHeight', { value: 200 })
    const renderer = new CanvasRendererService(canvas)

    renderer.render(labeledFrame, palette)

    expect(ctx.fillText).toHaveBeenCalledTimes(1)
    expect(ctx.fillText).toHaveBeenCalledWith('Pricing', 80, 90)
    expect(ctx.stroke).toHaveBeenCalledTimes(1)
    expect(ctx.fill).toHaveBeenCalledTimes(2)
    expect(ctx.arc).toHaveBeenCalledTimes(2)
  })

  it('lights only incident edges in a triangle with a second-level branch', () => {
    const ctx = fakeContext()
    const colors: string[] = []
    ctx.stroke.mockImplementation(() => {
      colors.push(ctx.strokeStyle)
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D
    )
    const canvas = document.createElement('canvas')
    Object.defineProperties(canvas, { clientWidth: { value: 200 }, clientHeight: { value: 200 } })
    const renderer = new CanvasRendererService(canvas)
    const frame: RenderFrame = {
      nodes: ['a', 'b', 'c', 'd'].map((id, index) => ({
        ...labeledFrame.nodes[1],
        id,
        x: index * 40,
        emphasized: index < 3
      })),
      edges: [
        { source: 0, target: 1 },
        { source: 0, target: 2 },
        { source: 1, target: 2 },
        { source: 2, target: 3 }
      ],
      activeId: 'a',
      reveal: 1,
      pulse: 0
    }
    renderer.render(frame, palette)
    expect(colors).toEqual([palette.primary, palette.primary, palette.muted, palette.muted])
    colors.length = 0
    renderer.render({ ...frame, activeId: null }, palette)
    expect(colors).toEqual(Array(4).fill(palette.muted))
    colors.length = 0
    renderer.render({ ...frame, activeId: null, programmaticIds: new Set(['a', 'd']) }, palette)
    expect(colors).toEqual([palette.primary, palette.primary, palette.muted, palette.primary])
  })

  it('shows keyboard focus as two outlines while presentation selection keeps resting discs', () => {
    const ctx = fakeContext()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D
    )
    const canvas = document.createElement('canvas')
    Object.defineProperties(canvas, { clientWidth: { value: 200 }, clientHeight: { value: 200 } })
    const renderer = new CanvasRendererService(canvas)
    renderer.render(
      {
        ...labeledFrame,
        edges: [],
        nodes: [{ ...labeledFrame.nodes[0], labeled: false, selected: true, focused: true }]
      },
      palette
    )
    expect(ctx.fillText).not.toHaveBeenCalled()
    expect(ctx.measureText).not.toHaveBeenCalled()
    expect(ctx.fill).toHaveBeenCalledTimes(1)
    expect(ctx.stroke).toHaveBeenCalledTimes(2)
    expect(ctx.arc.mock.calls[1][2]).toBeGreaterThan(ctx.arc.mock.calls[0][2])
    expect(ctx.arc.mock.calls[2][2]).toBeGreaterThan(ctx.arc.mock.calls[1][2])
  })

  it('keeps hit testing in CSS pixels at high DPR', () => {
    const ctx = fakeContext()
    vi.stubGlobal('devicePixelRatio', 2)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D
    )
    const canvas = document.createElement('canvas')
    Object.defineProperties(canvas, { clientWidth: { value: 200 }, clientHeight: { value: 200 } })
    const renderer = new CanvasRendererService(canvas)
    renderer.render(labeledFrame, palette)
    expect(canvas.width).toBe(400)
    expect(ctx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0)
    expect(renderer.pick(80, 90)).toBe('pricing')
    expect(renderer.pick(160, 180)).toBe(null)
  })
})
