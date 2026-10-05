import type { GraphEdge } from './graph.types'

export interface Viewport {
  readonly width: number
  readonly height: number
}

export interface ProjectedPoint {
  readonly x: number
  readonly y: number
  /** 0 is farthest from the camera, 1 is nearest. */
  readonly depth: number
}

export interface RenderNode extends ProjectedPoint {
  readonly id: string
  readonly name: string
  readonly weight: number
  /** 0 paints the text token, 1 paints primary; in between blends the two. */
  readonly lit: number
  readonly emphasized: boolean
  readonly dimmed: boolean
  /** Exact keyboard focus; distinct from the active neighborhood. */
  readonly focused: boolean
  /** The semantic selection remains identifiable during another node's preview. */
  readonly selected: boolean
  /** Click-activated discs paint `name` inside the circle. */
  readonly labeled: boolean
}

export interface SceneInteraction {
  readonly programmaticIds?: ReadonlySet<string>
  readonly activeId: string | null
  readonly activeIds: ReadonlySet<string>
  readonly selectedId: string | null
  readonly labeledIds: ReadonlySet<string>
  readonly focusedId: string | null
  readonly semantic: boolean
}

/** Everything the renderer needs for one frame, already projected to screen space. */
export interface RenderFrame {
  /** Exact programmatic nodes; all incident edges receive active treatment. */
  readonly programmaticIds?: ReadonlySet<string>
  readonly nodes: readonly RenderNode[]
  readonly edges: readonly GraphEdge[]
  /** Only edges incident to this exact ID receive the active treatment. */
  readonly activeId: string | null
  /** Intro progress from 0 to 1: edges grow in and nodes fade in. */
  readonly reveal: number
  /** Heartbeat intensity from 0 to 1; stays 0 outside the pulse move. */
  readonly pulse: number
}
