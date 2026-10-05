import type { SinapsiGraphDocument } from './nodes.types'
import type { SinapsiMove, SinapsiPalette, SinapsiPaletteOverrides } from './properties.types'

/**
 * Public surface of `<sinaps-i>`. Attributes are the source of truth: getters
 * read and normalize them, setters write normalized values back.
 */
export interface SinapsiElement extends HTMLElement {
  get palette(): SinapsiPalette
  set palette(value: SinapsiPaletteOverrides | null | undefined)
  get move(): SinapsiMove
  set move(value: SinapsiMove | null | undefined)
  get speed(): number
  set speed(value: number | null | undefined)
  /** Exact semantic IDs to highlight without interaction. Invalid values retain the previous set. */
  get activeNodeIds(): readonly string[]
  set activeNodeIds(value: readonly string[] | null | undefined)
  get nodes(): SinapsiGraphDocument | null
  set nodes(value: SinapsiGraphDocument | string | null | undefined)
}

export type SinapsiElementConstructor = CustomElementConstructor & {
  new (): SinapsiElement
  readonly observedAttributes: readonly string[]
  readonly prototype: SinapsiElement
}

/** Visual internals created inside the closed shadow root. */
export interface SinapsiShadowTree {
  readonly root: ShadowRoot
  readonly canvas: HTMLCanvasElement
  readonly listbox: HTMLElement
  readonly presentation: HTMLDivElement
  readonly close: HTMLButtonElement
  readonly content: HTMLDivElement
  readonly live: HTMLElement
  syncOptions(document: SinapsiGraphDocument | null): void
  optionId(index: number): string
  syncSelection(id: string | null): void
}
