import { lerp } from '@core/math/scalar.compute'
import { type PickableNode, pickNode } from '@core/scene/pick-node.compute'
import type { SinapsiPalette } from '@domain/kernel/properties.types'
import type { RenderFrame, RenderNode, Viewport } from '@domain/kernel/render.types'
import { blendHex } from '@services/scene.service'

const BASE_VIEW = 256
const LABEL_PADDING = 6

/** Paints an Obsidian-colored 3D plexus: muted leaves, bright hubs, accent when activated. */
export class CanvasRendererService {
  private readonly ctx: CanvasRenderingContext2D
  private hits: PickableNode[] = []

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('2D canvas context is not available')
    }
    this.ctx = ctx
    this.resize()
  }

  get viewport(): Viewport {
    return { width: this.canvas.clientWidth, height: this.canvas.clientHeight }
  }

  resize(): void {
    const dpr = globalThis.devicePixelRatio || 1
    const { width, height } = this.viewport
    this.canvas.width = Math.max(1, Math.round(width * dpr))
    this.canvas.height = Math.max(1, Math.round(height * dpr))
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  render(frame: RenderFrame, palette: SinapsiPalette): void {
    this.ctx.clearRect(0, 0, this.viewport.width, this.viewport.height)
    this.paintEdges(frame, palette)
    this.paintNodes(frame, palette)
  }

  pick(x: number, y: number): string | null {
    return pickNode(this.hits, x, y)
  }

  pointerOnCanvas(event: PointerEvent): { x: number; y: number } {
    const bounds = this.canvas.getBoundingClientRect()
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
  }

  private paintEdges(
    { nodes, edges, reveal, activeId, programmaticIds }: RenderFrame,
    palette: SinapsiPalette
  ): void {
    const visible = edges.slice(0, Math.floor(edges.length * Math.max(reveal, 0.2)))
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'

    for (const edge of visible) {
      const from = nodes[edge.source]
      const to = nodes[edge.target]
      const near = 1 - (from.depth + to.depth) / 2
      const neighborhood =
        (activeId !== null && (from.id === activeId || to.id === activeId)) ||
        Boolean(programmaticIds?.has(from.id) || programmaticIds?.has(to.id))
      const dim = from.dimmed && to.dimmed ? 0.28 : 1
      this.ctx.lineWidth = neighborhood ? 1.6 : 1
      this.ctx.strokeStyle = neighborhood ? palette.primary : palette.muted
      this.ctx.globalAlpha =
        (neighborhood ? 0.55 + 0.35 * near : 0.14 + 0.28 * near) * Math.max(reveal, 0.45) * dim
      this.ctx.beginPath()
      this.ctx.moveTo(from.x, from.y)
      this.ctx.lineTo(to.x, to.y)
      this.ctx.stroke()
    }
  }

  private paintNodes({ nodes, reveal }: RenderFrame, palette: SinapsiPalette): void {
    const scale = this.nodeScale()
    const farToNear = [...nodes].sort((a, b) => a.depth - b.depth)
    this.hits = []
    for (const node of farToNear) {
      const depthFade = lerp(1, 0.42, node.depth)
      const restingRadius = lerp(1.5, 5.0, node.weight ** 1.7) * scale * depthFade
      const fontSize = Math.max(10, 11 * scale)
      this.ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`
      const captionWidth = node.labeled ? this.ctx.measureText(node.name).width : 0
      const radius = node.labeled
        ? Math.max(restingRadius, captionWidth / 2 + LABEL_PADDING * scale, fontSize)
        : restingRadius
      this.hits.push({ id: node.id, x: node.x, y: node.y, depth: node.depth, radius })
      const resting = blendHex(palette.muted, palette.text, node.weight ** 0.55)
      this.ctx.globalAlpha =
        Math.max(reveal, 0.55) * lerp(1, 0.55, node.depth) * (node.dimmed ? 0.22 : 1)
      this.ctx.fillStyle = blendHex(resting, palette.primary, node.lit)
      this.ctx.shadowColor = palette.primary
      this.ctx.shadowBlur = node.lit * 4 * scale
      this.disc(node, radius)
      this.ctx.shadowBlur = 0
      if (node.labeled) {
        this.ctx.globalAlpha = Math.max(reveal, 0.9)
        this.ctx.fillStyle = palette.text
        this.ctx.textAlign = 'center'
        this.ctx.textBaseline = 'middle'
        this.ctx.fillText(node.name, node.x, node.y)
      }
      if (node.focused) {
        // Concentric outlines communicate keyboard focus without relying on accent color.
        this.ctx.globalAlpha = 1
        this.ctx.strokeStyle = palette.text
        this.ctx.lineWidth = 2
        this.outline(node, radius + 4)
        this.ctx.lineWidth = 1
        this.outline(node, radius + 7)
      } else if (node.selected && !node.labeled) {
        this.ctx.globalAlpha = 0.9
        this.ctx.strokeStyle = palette.primary
        this.ctx.lineWidth = 1.5
        this.outline(node, radius + 3)
      }
    }
  }

  private nodeScale(): number {
    return Math.min(this.viewport.width, this.viewport.height) / BASE_VIEW
  }

  private disc({ x, y }: RenderNode, radius: number): void {
    this.ctx.beginPath()
    this.ctx.arc(x, y, radius, 0, Math.PI * 2)
    this.ctx.fill()
  }

  private outline({ x, y }: RenderNode, radius: number): void {
    this.ctx.beginPath()
    this.ctx.arc(x, y, radius, 0, Math.PI * 2)
    this.ctx.stroke()
  }
}
