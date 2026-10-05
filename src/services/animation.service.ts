import { sinapsiConfiguration } from '@core/config.data'
import { createGraph } from '@core/graph/create-graph.compute'
import { createSemanticGraph } from '@core/graph/create-semantic-graph.compute'
import { neighborhoodIds } from '@core/graph/neighborhood.compute'
import type { FrameCallback, FrameLoop, Tween, TweenHandle } from '@domain/kernel/motion.types'
import type { SinapsiGraphDocument } from '@domain/kernel/nodes.types'
import type { SinapsiMove, SinapsiProperties } from '@domain/kernel/properties.types'
import type { RenderFrame, SceneInteraction } from '@domain/kernel/render.types'
import { CanvasRendererService } from '@services/renderer.service'
import { GraphSceneService } from '@services/scene.service'
import { animate, cancelFrame, frame } from 'motion'

const MS_PER_SECOND = 1000

const scheduled = new WeakMap<FrameCallback, FrameCallback>()

const motionLoop: FrameLoop = {
  schedule(callback) {
    const process: FrameCallback = ({ delta }) => {
      callback({ delta })
    }
    scheduled.set(callback, process)
    frame.update(process, true)
  },
  cancel(callback) {
    const process = scheduled.get(callback)
    if (process) {
      cancelFrame(process)
      scheduled.delete(callback)
    }
  }
}

const motionTween: Tween = (from, to, durationSeconds, onUpdate) => {
  const controls = animate(from, to, {
    duration: durationSeconds,
    ease: 'easeOut',
    onUpdate
  })
  return { stop: () => controls.stop() }
}

export interface AnimationDependencies {
  readonly loop?: FrameLoop
  readonly tween?: Tween
}

/** Per-instance render loop; content updates preserve the graph's topology and motion. */
export class GraphAnimationService {
  private readonly scene: GraphSceneService
  private readonly renderer: CanvasRendererService
  private readonly loop: FrameLoop
  private readonly tween: Tween
  private revealTween: TweenHandle | null = null
  private scheduled = false
  private readonly tick: FrameCallback
  private properties: SinapsiProperties
  private running = false
  private frozen = false
  private hoverId: string | null = null
  private focusedId: string | null = null
  private selectedId: string | null = null
  private showSelectedLabels = false
  private frameListener: ((frame: RenderFrame) => void) | null = null
  private semanticSignature: string | null = null

  constructor(
    canvas: HTMLCanvasElement,
    properties: SinapsiProperties,
    dependencies: AnimationDependencies = {}
  ) {
    this.properties = properties
    this.scene = new GraphSceneService(graphFrom(properties))
    this.semanticSignature = signatureOf(properties.semanticNodes)
    this.renderer = new CanvasRendererService(canvas)
    this.loop = dependencies.loop ?? motionLoop
    this.tween = dependencies.tween ?? motionTween
    this.tick = ({ delta }) => {
      if (!this.running || this.frozen) return
      const move = this.effectiveMove()
      if (!this.frozen) {
        this.scene.advance(delta / MS_PER_SECOND, this.properties.move, this.properties.speed)
      }
      this.renderFrame(move)
    }
    this.scene.reveal = 0.35
  }

  start(): void {
    if (this.running) {
      return
    }

    this.running = true
    if (this.frozen) this.scene.reveal = 1
    else if (this.scene.reveal < 1) {
      this.revealTween = this.tween(
        this.scene.reveal,
        1,
        sinapsiConfiguration.motion.revealSeconds,
        (value) => {
          this.scene.reveal = value
        }
      )
    }
    this.resize()
    this.syncLoop()
  }

  apply(properties: SinapsiProperties): void {
    const nextSignature = signatureOf(properties.semanticNodes)
    const graphChanged =
      nextSignature !== this.semanticSignature ||
      (nextSignature === null && properties.generatedNodes !== this.properties.generatedNodes)

    if (graphChanged) {
      this.scene.replaceGraph(graphFrom(properties))
      this.semanticSignature = nextSignature
    } else if (properties.semanticNodes) {
      this.scene.updateNames(
        new Map(properties.semanticNodes.graph.map((node) => [node.id, node.name]))
      )
    }

    this.properties = properties
    const validIds = new Set(properties.semanticNodes?.graph.map((node) => node.id))
    if (this.hoverId !== null && !validIds.has(this.hoverId)) this.hoverId = null
    if (this.focusedId !== null && !validIds.has(this.focusedId)) this.focusedId = null
    if (this.selectedId !== null && !validIds.has(this.selectedId)) this.selectedId = null
    if (this.running) this.renderFrame()
  }

  setFrozen(frozen: boolean): void {
    if (this.frozen === frozen) return
    this.frozen = frozen
    if (frozen) {
      this.revealTween?.stop()
      this.revealTween = null
      this.scene.reveal = 1
    }
    this.syncLoop()
    if (this.running) this.renderFrame()
  }

  setHoverId(id: string | null): void {
    if (this.hoverId === id) return
    this.hoverId = id
    if (this.running && this.frozen) this.renderFrame()
  }

  setFocusedId(id: string | null): void {
    if (this.focusedId === id) return
    this.focusedId = id
    if (this.running && this.frozen) this.renderFrame()
  }

  activateNeighborhood(id: string): void {
    this.selectNode(id, true)
  }

  /** Selection is independent of hover/focus and does not imply disc labels. */
  selectNode(id: string | null, showLabels = false): void {
    const node = this.properties.semanticNodes?.graph.find((entry) => entry.id === id)
    this.selectedId = node?.id ?? null
    this.showSelectedLabels = showLabels
    if (this.running && this.frozen) this.renderFrame()
  }

  /** Receives the exact frame already drawn, in CSS pixels, including frozen frames. */
  setFrameListener(listener: ((frame: RenderFrame) => void) | null): void {
    this.frameListener = listener
  }

  pick(event: PointerEvent): string | null {
    const point = this.renderer.pointerOnCanvas(event)
    return this.renderer.pick(point.x, point.y)
  }

  resize(): void {
    this.renderer.resize()
    this.renderFrame()
  }

  dispose(): void {
    this.frameListener = null
    this.revealTween?.stop()
    this.revealTween = null
    // A reconnect reuses this service; do not leave the graph partially revealed.
    this.scene.reveal = 1
    if (!this.running) {
      return
    }

    this.running = false
    this.syncLoop()
  }

  private syncLoop(): void {
    const shouldRun = this.running && !this.frozen
    if (shouldRun === this.scheduled) return
    this.scheduled = shouldRun
    if (shouldRun) this.loop.schedule(this.tick)
    else this.loop.cancel(this.tick)
  }

  private effectiveMove(): SinapsiMove {
    return this.frozen ? 'idle' : this.properties.move
  }

  private interaction(): SceneInteraction {
    const document = this.properties.semanticNodes
    const activeId = this.hoverId ?? this.focusedId ?? this.selectedId
    const activeIds = document && activeId ? neighborhoodIds(document, activeId) : new Set<string>()
    const selectedNode = document?.graph.find((node) => node.id === this.selectedId)
    const showLabels =
      this.showSelectedLabels && !selectedNode?.presentation && activeId === this.selectedId
    return {
      activeId,
      activeIds,
      programmaticIds: new Set(this.properties.activeNodeIds ?? []),
      selectedId: this.selectedId,
      labeledIds: showLabels ? activeIds : new Set(),
      focusedId: this.focusedId,
      semantic: document !== null
    }
  }

  private renderFrame(move = this.effectiveMove()): void {
    const snapshot = this.scene.snapshot(this.renderer.viewport, move, this.interaction())
    this.renderer.render(snapshot, this.properties.palette)
    this.frameListener?.(snapshot)
  }
}

function graphFrom(properties: SinapsiProperties) {
  return properties.semanticNodes
    ? createSemanticGraph(properties.semanticNodes)
    : createGraph(properties.generatedNodes)
}

function signatureOf(document: SinapsiGraphDocument | null): string | null {
  if (!document) return null
  const ids = document.graph.map((node) => node.id).sort()
  const edges = new Set<string>()
  for (const node of document.graph) {
    for (const link of node.links) edges.add(JSON.stringify([node.id, link.id].sort()))
  }
  return JSON.stringify([ids, [...edges].sort()])
}
