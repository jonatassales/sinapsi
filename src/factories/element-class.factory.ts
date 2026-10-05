import {
  DEFAULT_SINAPSI_NODES,
  DEFAULT_SINAPSI_PALETTE,
  SINAPSI_COLOR_ATTRIBUTES,
  SINAPSI_COLOR_KEYS,
  SINAPSI_OBSERVED_ATTRIBUTES
} from '@core/config.data'
import { normalizeColor } from '@core/lib/normalize-color.compute'
import { normalizeMove } from '@core/lib/normalize-move.compute'
import {
  parseNodesDocument,
  reportInvalidNodes,
  serializeNodesDocument
} from '@core/lib/normalize-nodes.compute'
import { normalizePalette } from '@core/lib/normalize-palette.compute'
import { normalizeSpeed } from '@core/lib/normalize-speed.compute'
import type {
  SinapsiElement,
  SinapsiElementConstructor,
  SinapsiShadowTree
} from '@domain/kernel/element.types'
import {
  SINAPSI_NODE_CLICK_EVENT,
  SINAPSI_NODE_HOVER_EVENT,
  type SinapsiGraphDocument,
  type SinapsiNode,
  SinapsiNodeEvent,
  type SinapsiNodeEventName
} from '@domain/kernel/nodes.types'
import type {
  SinapsiColorKey,
  SinapsiMove,
  SinapsiPalette,
  SinapsiPaletteOverrides
} from '@domain/kernel/properties.types'
import { sinapsiShadowTreeFactory } from '@factories/shadow-tree.factory'
import { GraphAnimationService } from '@services/animation.service'
import { GraphPresentationService } from '@services/presentation.service'

const ELEMENT_CONSTRUCTORS = new WeakMap<object, SinapsiElementConstructor>()
const POINTER_CLICK_SLOP_PX = 6
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Creates the Sinapsi custom-element class only when a DOM implementation exists.
 * Importing this module on a server never evaluates an HTMLElement subclass.
 */
export function sinapsiElementClassFactory(): SinapsiElementConstructor | undefined {
  if (typeof globalThis.HTMLElement === 'undefined') {
    return undefined
  }

  const HTMLElementBase = globalThis.HTMLElement
  const existingConstructor = ELEMENT_CONSTRUCTORS.get(HTMLElementBase)
  if (existingConstructor) {
    return existingConstructor
  }

  class SinapsiHTMLElement extends HTMLElementBase implements SinapsiElement {
    static readonly observedAttributes = SINAPSI_OBSERVED_ATTRIBUTES

    readonly #tree: SinapsiShadowTree
    readonly #animation: GraphAnimationService
    readonly #presentation: GraphPresentationService
    #acceptedActiveIds: string[] = []
    #acceptedNodes: SinapsiGraphDocument | null = null
    #connected = false
    #hostHovered = false
    #listFocused = false
    #hoverId: string | null = null
    #selectedId: string | null = null
    #activeIndex = -1
    #pointerDownId: string | null = null
    #pointerDownX = 0
    #pointerDownY = 0
    #pointerId: number | null = null
    #lastPointerInteraction = false
    #resizeObserver: ResizeObserver | undefined
    #motionQuery: MediaQueryList | undefined

    constructor() {
      super()
      const shadowRoot = this.attachShadow({ mode: 'closed' })
      this.#tree = sinapsiShadowTreeFactory(shadowRoot, this.ownerDocument)
      this.#animation = new GraphAnimationService(this.#tree.canvas, this.#properties())
      this.#presentation = new GraphPresentationService(this, this.#tree)
      this.#syncAccessibility()
    }

    get palette(): SinapsiPalette {
      const palette = { ...DEFAULT_SINAPSI_PALETTE }
      for (const key of SINAPSI_COLOR_KEYS) {
        palette[key] = normalizeColor(key, this.getAttribute(SINAPSI_COLOR_ATTRIBUTES[key]))
      }
      return palette
    }

    set palette(value: SinapsiPaletteOverrides | null | undefined) {
      const palette = normalizePalette(value)
      for (const key of SINAPSI_COLOR_KEYS) {
        this.setAttribute(SINAPSI_COLOR_ATTRIBUTES[key], palette[key])
      }
    }

    get move(): SinapsiMove {
      return normalizeMove(this.getAttribute('move'))
    }

    set move(value: SinapsiMove | null | undefined) {
      if (value === null || value === undefined) {
        this.removeAttribute('move')
        return
      }

      this.setAttribute('move', normalizeMove(value))
    }

    get speed(): number {
      return normalizeSpeed(this.getAttribute('speed'))
    }

    set speed(value: number | null | undefined) {
      if (value === null || value === undefined) {
        this.removeAttribute('speed')
        return
      }

      this.setAttribute('speed', String(normalizeSpeed(value)))
    }

    get activeNodeIds(): readonly string[] {
      return [...this.#acceptedActiveIds]
    }

    set activeNodeIds(value: readonly string[] | null | undefined) {
      if (value == null) {
        this.removeAttribute('active-node-ids')
        return
      }
      if (
        !Array.isArray(value) ||
        !value.every((id) => typeof id === 'string' && id.trim().length > 0)
      ) {
        console.error(
          '[Sinapsi] Invalid activeNodeIds: expected nonempty string IDs. Keeping previous activation.'
        )
        return
      }
      this.setAttribute('active-node-ids', JSON.stringify(value))
    }

    get nodes(): SinapsiGraphDocument | null {
      return this.#acceptedNodes ? structuredClone(this.#acceptedNodes) : null
    }

    set nodes(value: SinapsiGraphDocument | string | null | undefined) {
      if (value === null || value === undefined) {
        this.removeAttribute('nodes')
        return
      }

      const parsed = parseNodesDocument(value)
      if (!parsed.ok) {
        reportInvalidNodes(value)
        return
      }

      this.setAttribute('nodes', serializeNodesDocument(parsed.document))
    }

    connectedCallback(): void {
      if (this.#connected) {
        return
      }

      this.#connected = true
      this.#listen()
      this.#presentation.connect()
      this.#animation.setFrameListener((frame) => this.#presentation.update(frame))
      this.#syncFreeze()
      this.#animation.start()
      this.#observeSize()
    }

    disconnectedCallback(): void {
      if (!this.#connected) {
        return
      }

      this.#connected = false
      this.#unlisten()
      this.#resizeObserver?.disconnect()
      this.#resizeObserver = undefined
      this.#presentation.disconnect()
      this.#resetInteraction()
      this.#hostHovered = false
      this.#listFocused = false
      this.#animation.setFrameListener(null)
      this.#animation.dispose()
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
      if (oldValue === newValue) {
        return
      }

      if (this.#normalizeAttribute(name, newValue)) {
        return
      }

      this.#syncAccessibility()
      if (name === 'aria-label' || name === 'close-label') return
      this.#animation.apply(this.#properties())
      this.#restoreSelection()
    }

    #normalizeAttribute(name: string, value: string | null): boolean {
      const colorKey = colorKeyForAttribute(name)
      if (colorKey) {
        if (value === null) {
          return false
        }
        const normalized = normalizeColor(colorKey, value)
        if (value !== normalized) {
          this.setAttribute(name, normalized)
          return true
        }
        return false
      }

      if (name === 'active-node-ids') return this.#normalizeActiveIds(value)

      if (name === 'nodes') {
        return this.#normalizeNodes(value)
      }

      if (value === null) {
        return false
      }

      if (name === 'move') {
        return rewrite(this, name, value, normalizeMove(value))
      }

      if (name === 'speed') {
        return rewrite(this, name, value, String(normalizeSpeed(value)))
      }

      return false
    }

    #normalizeActiveIds(value: string | null): boolean {
      let parsed: unknown = []
      try {
        parsed = value === null ? [] : JSON.parse(value)
      } catch {
        parsed = null
      }
      if (
        !Array.isArray(parsed) ||
        !parsed.every((id) => typeof id === 'string' && id.trim().length > 0)
      ) {
        console.error(
          '[Sinapsi] Invalid active-node-ids: expected a JSON array of nonempty string IDs. Keeping previous activation.'
        )
        return rewrite(
          this,
          'active-node-ids',
          value ?? '',
          JSON.stringify(this.#acceptedActiveIds)
        )
      }
      const valid = new Set(this.#acceptedNodes?.graph.map((node) => node.id))
      this.#acceptedActiveIds = [...new Set(parsed as string[])].filter((id) => valid.has(id))
      return (
        value !== null &&
        rewrite(this, 'active-node-ids', value, JSON.stringify(this.#acceptedActiveIds))
      )
    }

    #pruneActivation(): void {
      const valid = new Set(this.#acceptedNodes?.graph.map((node) => node.id))
      const ids = this.#acceptedActiveIds.filter((id) => valid.has(id))
      if (ids.length !== this.#acceptedActiveIds.length) this.activeNodeIds = ids
    }

    #normalizeNodes(value: string | null): boolean {
      if (value === null) {
        this.#acceptedNodes = null
        this.#pruneActivation()
        this.#presentation.close(this.#tree.presentation.contains(this.#tree.root.activeElement))
        this.#resetInteraction()
        this.#tree.syncOptions(null)
        return false
      }

      const parsed = parseNodesDocument(value)
      if (!parsed.ok) {
        reportInvalidNodes(value)
        if (this.#acceptedNodes) {
          return rewrite(this, 'nodes', value, serializeNodesDocument(this.#acceptedNodes))
        }

        this.removeAttribute('nodes')
        return true
      }

      const focusedId = this.#acceptedNodes?.graph[this.#activeIndex]?.id
      this.#acceptedNodes = parsed.document
      this.#pruneActivation()
      if (this.#selectedId && !this.#nodeById(this.#selectedId)) {
        this.#presentation.close(this.#tree.presentation.contains(this.#tree.root.activeElement))
        this.#selectedId = null
      }
      const opened = this.#nodeById(this.#presentation.openId)
      if (opened?.presentation) this.#presentation.show(opened, false)
      else if (this.#presentation.openId) {
        this.#closePresentation(this.#tree.presentation.contains(this.#tree.root.activeElement))
      }
      if (this.#hoverId && !this.#nodeById(this.#hoverId)) this.#setHover(null)
      this.#activeIndex = focusedId
        ? parsed.document.graph.findIndex((node) => node.id === focusedId)
        : -1
      this.#tree.syncOptions(parsed.document)
      if (this.#activeIndex >= 0) {
        this.#tree.listbox.setAttribute(
          'aria-activedescendant',
          this.#tree.optionId(this.#activeIndex)
        )
      } else if (this.#listFocused) this.#focusOption(0)
      this.#tree.syncSelection(this.#selectedId)
      return rewrite(this, 'nodes', value, serializeNodesDocument(parsed.document))
    }

    #properties() {
      return {
        palette: this.palette,
        move: this.move,
        speed: this.speed,
        generatedNodes: DEFAULT_SINAPSI_NODES,
        activeNodeIds: this.#acceptedActiveIds,
        semanticNodes: this.#acceptedNodes
      }
    }

    #listen(): void {
      this.addEventListener('pointerenter', this.#onPointerEnter)
      this.addEventListener('pointerleave', this.#onPointerLeave)
      this.#tree.canvas.addEventListener('pointermove', this.#onPointerMove)
      this.#tree.canvas.addEventListener('pointerdown', this.#onPointerDown)
      this.#tree.canvas.addEventListener('pointerup', this.#onPointerUp)
      this.#tree.canvas.addEventListener('pointercancel', this.#onPointerCancel)
      this.#tree.canvas.addEventListener('pointerleave', this.#onPointerCancel)
      this.#tree.listbox.addEventListener('keydown', this.#onListKeyDown)
      this.#tree.listbox.addEventListener('focus', this.#onListFocus)
      this.#tree.listbox.addEventListener('blur', this.#onListBlur)
      this.#tree.root.addEventListener('keydown', this.#onShadowKeyDown)
      this.#tree.close.addEventListener('click', this.#onClose)
      this.ownerDocument.addEventListener('pointerdown', this.#onDocumentPointerDown, true)
      this.ownerDocument.addEventListener('keydown', this.#onDocumentKeyDown)
      this.#motionQuery = globalThis.matchMedia?.(REDUCED_MOTION_QUERY)
      this.#motionQuery?.addEventListener('change', this.#onMotionPreference)
    }

    #unlisten(): void {
      this.removeEventListener('pointerenter', this.#onPointerEnter)
      this.removeEventListener('pointerleave', this.#onPointerLeave)
      this.#tree.canvas.removeEventListener('pointermove', this.#onPointerMove)
      this.#tree.canvas.removeEventListener('pointerdown', this.#onPointerDown)
      this.#tree.canvas.removeEventListener('pointerup', this.#onPointerUp)
      this.#tree.canvas.removeEventListener('pointercancel', this.#onPointerCancel)
      this.#tree.canvas.removeEventListener('pointerleave', this.#onPointerCancel)
      this.#tree.listbox.removeEventListener('keydown', this.#onListKeyDown)
      this.#tree.listbox.removeEventListener('focus', this.#onListFocus)
      this.#tree.listbox.removeEventListener('blur', this.#onListBlur)
      this.#tree.root.removeEventListener('keydown', this.#onShadowKeyDown)
      this.#tree.close.removeEventListener('click', this.#onClose)
      this.ownerDocument.removeEventListener('pointerdown', this.#onDocumentPointerDown, true)
      this.ownerDocument.removeEventListener('keydown', this.#onDocumentKeyDown)
      this.#motionQuery?.removeEventListener('change', this.#onMotionPreference)
      this.#motionQuery = undefined
    }

    #syncFreeze(): void {
      this.#animation.setFrozen(this.#hostHovered || this.#listFocused || prefersReducedMotion())
    }

    #resetInteraction(): void {
      this.#hoverId = null
      this.#activeIndex = -1
      this.#pointerDownId = null
      this.#pointerId = null
      this.#selectedId = null
      this.#lastPointerInteraction = false
      this.#animation.setHoverId(null)
      this.#animation.setFocusedId(null)
      this.#animation.selectNode(null)
      this.#tree.syncSelection(null)
      this.#tree.listbox.removeAttribute('aria-activedescendant')
    }

    #setHover(id: string | null): void {
      if (id === this.#hoverId) {
        return
      }

      this.#hoverId = id
      this.#animation.setHoverId(id)
      const node = this.#nodeById(id)
      if (node) {
        this.#emit(SINAPSI_NODE_HOVER_EVENT, node, SinapsiNodeEvent.Hover)
      }
    }

    #activate(id: string): void {
      const node = this.#nodeById(id)
      if (node) {
        this.#activeIndex = this.#acceptedNodes?.graph.findIndex((entry) => entry.id === id) ?? -1
        this.#tree.listbox.setAttribute(
          'aria-activedescendant',
          this.#tree.optionId(this.#activeIndex)
        )
        if (node.presentation && this.#presentation.openId === id) {
          this.#closePresentation(false)
        } else {
          this.#presentation.close(false)
          this.#selectedId = id
          this.#animation.selectNode(id, !node.presentation)
          this.#tree.syncSelection(id)
          if (node.presentation) this.#presentation.show(node)
        }
        this.#emit(SINAPSI_NODE_CLICK_EVENT, node, SinapsiNodeEvent.Click)
      }
    }

    #closePresentation(restoreFocus: boolean): void {
      if (!this.#presentation.openId) return
      const id = this.#presentation.openId
      this.#presentation.close(restoreFocus)
      if (this.#selectedId === id) {
        this.#selectedId = null
        this.#animation.selectNode(null)
        this.#tree.syncSelection(null)
      }
    }

    #restoreSelection(): void {
      const node = this.#nodeById(this.#selectedId)
      this.#animation.selectNode(node?.id ?? null, !node?.presentation)
      this.#tree.syncSelection(node?.id ?? null)
    }

    #syncAccessibility(): void {
      this.#tree.listbox.setAttribute(
        'aria-label',
        this.getAttribute('aria-label')?.trim() || 'Graph nodes'
      )
      this.#presentation.configure(this.palette, this.getAttribute('close-label') ?? 'Close')
    }

    #nodeById(id: string | null): SinapsiNode | undefined {
      if (!id || !this.#acceptedNodes) {
        return undefined
      }

      return this.#acceptedNodes.graph.find((node) => node.id === id)
    }

    #emit(
      type: typeof SINAPSI_NODE_CLICK_EVENT | typeof SINAPSI_NODE_HOVER_EVENT,
      node: SinapsiNode,
      event: SinapsiNodeEventName
    ): void {
      this.dispatchEvent(
        new CustomEvent(type, {
          detail: { id: node.id, event, payload: node.payload },
          bubbles: true,
          composed: true,
          cancelable: false
        })
      )
    }

    #focusOption(index: number): void {
      const nodes = this.#acceptedNodes?.graph ?? []
      const node = nodes[index]
      if (!node) {
        return
      }

      const previousId = nodes[this.#activeIndex]?.id
      this.#activeIndex = index
      this.#tree.listbox.setAttribute('aria-activedescendant', this.#tree.optionId(index))
      this.#animation.setFocusedId(node.id)
      if (previousId !== node.id) {
        this.#emit(SINAPSI_NODE_HOVER_EVENT, node, SinapsiNodeEvent.Hover)
      }
    }

    #onPointerEnter = (): void => {
      this.#hostHovered = true
      this.#syncFreeze()
    }

    #onPointerLeave = (): void => {
      this.#hostHovered = false
      this.#pointerDownId = null
      this.#pointerId = null
      this.#setHover(null)
      this.#syncFreeze()
    }

    #onPointerMove = (event: PointerEvent): void => {
      if (!this.#acceptedNodes) {
        return
      }

      this.#setHover(this.#animation.pick(event))
    }

    #onPointerDown = (event: PointerEvent): void => {
      if (!this.#acceptedNodes || event.button !== 0) {
        return
      }

      this.#pointerDownId = this.#animation.pick(event)
      this.#pointerId = event.pointerId
      this.#pointerDownX = event.clientX
      this.#pointerDownY = event.clientY
    }

    #onPointerUp = (event: PointerEvent): void => {
      if (!this.#acceptedNodes || this.#pointerId !== event.pointerId) {
        return
      }

      const distance = Math.hypot(
        event.clientX - this.#pointerDownX,
        event.clientY - this.#pointerDownY
      )
      const id = this.#animation.pick(event)
      if (distance <= POINTER_CLICK_SLOP_PX && id && id === this.#pointerDownId) {
        this.#lastPointerInteraction = true
        this.#activate(id)
      } else if (distance <= POINTER_CLICK_SLOP_PX && !id && !this.#pointerDownId) {
        this.#closePresentation(false)
      }

      this.#pointerDownId = null
      this.#pointerId = null
    }

    #onPointerCancel = (): void => {
      this.#pointerDownId = null
      this.#pointerId = null
      this.#setHover(null)
    }

    #onClose = (): void => {
      this.#closePresentation(true)
    }

    #onDocumentPointerDown = (event: PointerEvent): void => {
      if (!event.composedPath().includes(this)) {
        this.#lastPointerInteraction = false
        this.#closePresentation(false)
        this.#setHover(null)
        // A nonfocusable outside target may otherwise leave keyboard preview on
        // the graph (or focus inside a just-hidden detail group). Blur locally;
        // the pointer's native default still chooses the external focus target.
        const focused = this.#tree.root.activeElement
        if (focused instanceof HTMLElement) focused.blur()
        this.#hostHovered = false
        this.#syncFreeze()
      }
    }

    #onShadowKeyDown = (event: Event): void => {
      const keyboard = event as KeyboardEvent
      if (keyboard.key === 'Escape' && this.#presentation.openId) {
        keyboard.preventDefault()
        keyboard.stopPropagation()
        this.#closePresentation(true)
      }
    }

    #onDocumentKeyDown = (event: KeyboardEvent): void => {
      if (
        event.key === 'Escape' &&
        this.#lastPointerInteraction &&
        this.ownerDocument.activeElement === this.ownerDocument.body
      ) {
        this.#closePresentation(false)
      }
    }

    #onListKeyDown = (event: KeyboardEvent): void => {
      const count = this.#acceptedNodes?.graph.length ?? 0
      if (count === 0) {
        return
      }

      if (['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(event.key)) {
        event.preventDefault()
        this.#focusOption(
          stepIndex(
            this.#activeIndex,
            event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1,
            count
          )
        )
        return
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        if (event.repeat) return
        const node = this.#acceptedNodes?.graph[this.#activeIndex]
        if (node) {
          this.#activate(node.id)
        }
      }
    }

    #onListFocus = (): void => {
      this.#listFocused = true
      this.#syncFreeze()
      if (this.#activeIndex < 0) {
        this.#focusOption(0)
      } else {
        this.#animation.setFocusedId(this.#acceptedNodes?.graph[this.#activeIndex]?.id ?? null)
      }
    }

    #onListBlur = (): void => {
      this.#listFocused = false
      this.#animation.setFocusedId(null)
      this.#syncFreeze()
    }

    #onMotionPreference = (): void => {
      this.#syncFreeze()
    }

    #observeSize(): void {
      if (typeof globalThis.ResizeObserver !== 'function') {
        return
      }

      this.#resizeObserver = new ResizeObserver(() => {
        this.#presentation.invalidate()
        this.#animation.resize()
      })
      this.#resizeObserver.observe(this)
    }
  }

  const elementConstructor = SinapsiHTMLElement as unknown as SinapsiElementConstructor
  ELEMENT_CONSTRUCTORS.set(HTMLElementBase, elementConstructor)
  return elementConstructor
}

function rewrite(element: HTMLElement, name: string, value: string, normalized: string): boolean {
  if (value === normalized) {
    return false
  }

  element.setAttribute(name, normalized)
  return true
}

function colorKeyForAttribute(name: string): SinapsiColorKey | undefined {
  return SINAPSI_COLOR_KEYS.find((key) => SINAPSI_COLOR_ATTRIBUTES[key] === name)
}

function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.(REDUCED_MOTION_QUERY)?.matches === true
}

function stepIndex(index: number, delta: number, count: number): number {
  if (index < 0) {
    return delta > 0 ? 0 : count - 1
  }

  return (index + delta + count) % count
}
