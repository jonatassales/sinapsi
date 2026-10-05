import { SINAPSI_TAG_NAME } from '@core/config.data'
import { serializeNodesDocument } from '@core/lib/normalize-nodes.compute'
import type { SinapsiElement } from '@domain/kernel/element.types'
import {
  SINAPSI_NODE_CLICK_EVENT,
  SINAPSI_NODE_HOVER_EVENT,
  type SinapsiGraphDocument,
  type SinapsiNodeClickEvent,
  type SinapsiNodeHoverEvent
} from '@domain/kernel/nodes.types'
import { GraphAnimationService } from '@services/animation.service'
import { GraphPresentationService } from '@services/presentation.service'
import { defineSinapsi } from '@services/registration.service'
import { CanvasRendererService } from '@services/renderer.service'
import { frame } from 'motion'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

const sample: SinapsiGraphDocument = {
  graph: [
    {
      id: 'cause',
      name: 'Drift cause',
      payload: { kind: 'cause' },
      links: [{ id: 'pricing', name: 'Pricing' }]
    },
    {
      id: 'pricing',
      name: 'Pricing',
      payload: { kind: 'pricing' },
      links: [{ id: 'cause', name: 'Drift cause' }]
    }
  ]
}

interface MutableGraphDocument {
  graph: Array<{
    id: string
    name: string
    payload: Record<string, unknown>
    links: Array<{ id: string; name: string }>
  }>
}

function asMutable(document: SinapsiGraphDocument): MutableGraphDocument {
  return structuredClone(document) as MutableGraphDocument
}

const roots = new WeakMap<HTMLElement, ShadowRoot>()

function createGraph(): SinapsiElement {
  const attach = HTMLElement.prototype.attachShadow
  const spy = vi.spyOn(HTMLElement.prototype, 'attachShadow').mockImplementation(function (
    this: HTMLElement,
    options
  ) {
    const root = attach.call(this, options)
    roots.set(this, root)
    return root
  })
  const element = document.createElement(SINAPSI_TAG_NAME) as SinapsiElement
  spy.mockRestore()
  document.body.append(element)
  return element
}

function canvasOf(element: HTMLElement): HTMLCanvasElement {
  return roots.get(element)?.querySelector('canvas') as HTMLCanvasElement
}

function listOf(element: HTMLElement): HTMLElement {
  return roots.get(element)?.querySelector('[role="listbox"]') as HTMLElement
}

function tap(element: HTMLElement): void {
  canvasOf(element).dispatchEvent(new PointerEvent('pointerdown', { clientX: 8, clientY: 8 }))
  canvasOf(element).dispatchEvent(new PointerEvent('pointerup', { clientX: 8, clientY: 8 }))
}

const presented: SinapsiGraphDocument = {
  graph: [
    {
      ...sample.graph[0],
      presentation: {
        type: 'card',
        title: 'Example',
        description: 'Context',
        reference: '#123',
        badge: '-3 drift'
      }
    },
    { ...sample.graph[1], presentation: { type: 'tooltip', description: 'A short explanation' } }
  ]
}

describe('factory/element-class', () => {
  beforeAll(() => {
    defineSinapsi()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.replaceChildren()
  })

  it('keeps the visual shadow tree closed', () => {
    expect(createGraph().shadowRoot).toBeNull()
  })

  it('omits nodes by default and does not observe activation', () => {
    const graph = createGraph()
    expect(graph.move).toBe('rotate')
    expect(graph.nodes).toBeNull()
    expect(graph.getAttribute('nodes')).toBeNull()
    expect(graph.getAttribute('activation')).toBeNull()
    expect(graph.speed).toBe(1)
    expect(graph.constructor).toHaveProperty('observedAttributes')
    expect(
      (graph.constructor as unknown as { observedAttributes: readonly string[] }).observedAttributes
    ).not.toContain('activation')
  })

  it('accepts a graph document, snapshots it, and keeps previous on invalid JSON', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const graph = createGraph()
    const input = asMutable(sample)
    graph.nodes = input
    input.graph[0].name = 'mutated'

    expect(graph.nodes).toEqual(sample)
    expect(graph.getAttribute('nodes')).toBe(serializeNodesDocument(sample))

    const snapshot = graph.nodes as unknown as MutableGraphDocument | null
    expect(snapshot).not.toBeNull()
    if (!snapshot) {
      return
    }
    snapshot.graph[0].name = 'from getter'
    expect(graph.nodes).toEqual(sample)

    graph.setAttribute('nodes', '9000')
    expect(graph.nodes).toEqual(sample)
    expect(graph.getAttribute('nodes')).toBe(serializeNodesDocument(sample))
    expect(error).toHaveBeenCalledWith(
      '[Sinapsi] Invalid nodes=9000: expected a JSON nodes document. Keeping previous graph.'
    )
  })

  it('normalizes invalid move without rewriting nodes to a density integer', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const graph = createGraph()

    graph.setAttribute('move', 'spin')
    graph.setAttribute('color-primary', 'orange')

    expect(graph.move).toBe('rotate')
    expect(graph.getAttribute('move')).toBe('rotate')
    expect(graph.nodes).toBeNull()
    expect(graph.palette.primary).toBe('#F97316')
    expect(error).toHaveBeenCalled()
  })

  it('freezes motion as idle on host hover without writing move', () => {
    const frozen = vi.spyOn(GraphAnimationService.prototype, 'setFrozen')
    const graph = createGraph()
    graph.move = 'rotate'
    frozen.mockClear()

    graph.dispatchEvent(new Event('pointerenter'))
    expect(graph.move).toBe('rotate')
    expect(frozen).toHaveBeenCalledTimes(1)
    expect(frozen).toHaveBeenCalledWith(true)

    graph.remove()
    document.body.append(graph)
    frozen.mockClear()
    graph.dispatchEvent(new Event('pointerenter'))
    expect(frozen).toHaveBeenCalledTimes(1)
  })

  it('always dispatches hover once per enter and click on pointerup', () => {
    vi.spyOn(CanvasRendererService.prototype, 'pick').mockReturnValue('pricing')
    const graph = createGraph()
    const hover: SinapsiNodeHoverEvent[] = []
    const click: SinapsiNodeClickEvent[] = []
    graph.addEventListener(SINAPSI_NODE_HOVER_EVENT, (event) => {
      hover.push(event as SinapsiNodeHoverEvent)
    })
    graph.addEventListener(SINAPSI_NODE_CLICK_EVENT, (event) => {
      click.push(event as SinapsiNodeClickEvent)
    })
    graph.nodes = sample

    expect(hover).toEqual([])
    expect(click).toEqual([])

    canvasOf(graph).dispatchEvent(new PointerEvent('pointermove', { clientX: 8, clientY: 8 }))
    canvasOf(graph).dispatchEvent(new PointerEvent('pointermove', { clientX: 9, clientY: 8 }))
    expect(hover).toHaveLength(1)
    expect(hover[0].detail).toEqual({
      id: 'pricing',
      event: 'hover',
      payload: { kind: 'pricing' }
    })
    expect(hover[0].bubbles).toBe(true)
    expect(hover[0].composed).toBe(true)

    tap(graph)
    expect(click).toHaveLength(1)
    expect(click[0].detail).toEqual({
      id: 'pricing',
      event: 'click',
      payload: { kind: 'pricing' }
    })
  })

  it('does not activate on a miss or a drag past the click slop', () => {
    const activate = vi.spyOn(GraphAnimationService.prototype, 'activateNeighborhood')
    const pick = vi.spyOn(CanvasRendererService.prototype, 'pick')
    const graph = createGraph()
    graph.nodes = sample

    pick.mockReturnValue(null)
    canvasOf(graph).dispatchEvent(new PointerEvent('pointerdown', { clientX: 1, clientY: 1 }))
    canvasOf(graph).dispatchEvent(new PointerEvent('pointerup', { clientX: 1, clientY: 1 }))
    expect(activate).not.toHaveBeenCalled()

    pick.mockReturnValue('cause')
    canvasOf(graph).dispatchEvent(new PointerEvent('pointerdown', { clientX: 10, clientY: 10 }))
    canvasOf(graph).dispatchEvent(new PointerEvent('pointerup', { clientX: 20, clientY: 10 }))
    expect(activate).not.toHaveBeenCalled()
  })

  it('preserves presentations across object, JSON, attribute and getter, retaining last valid data', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const graph = createGraph()
    graph.nodes = presented
    expect(graph.nodes).toEqual(presented)
    graph.nodes = JSON.stringify(presented)
    expect(graph.nodes).toEqual(presented)
    graph.setAttribute('nodes', JSON.stringify(presented))
    expect(graph.nodes).toEqual(presented)
    graph.nodes = JSON.stringify({
      graph: [{ ...sample.graph[0], links: [], presentation: { type: 'tooltip', description: '' } }]
    })
    expect(graph.nodes).toEqual(presented)
  })

  it('never opens on hover/focus, preserves an open card during another preview and toggles explicit activation', () => {
    const pick = vi.spyOn(CanvasRendererService.prototype, 'pick').mockReturnValue('cause')
    const show = vi.spyOn(GraphPresentationService.prototype, 'show')
    const select = vi.spyOn(GraphAnimationService.prototype, 'selectNode')
    const graph = createGraph()
    graph.nodes = presented
    canvasOf(graph).dispatchEvent(new PointerEvent('pointermove'))
    listOf(graph).focus()
    expect(show).not.toHaveBeenCalled()
    tap(graph)
    expect(show).toHaveBeenCalledTimes(1)
    expect(select).toHaveBeenLastCalledWith('cause', false)
    expect(
      listOf(graph).querySelector('[data-node-id="cause"]')?.getAttribute('aria-selected')
    ).toBe('true')
    pick.mockReturnValue('pricing')
    canvasOf(graph).dispatchEvent(new PointerEvent('pointermove'))
    listOf(graph).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    expect(show).toHaveBeenCalledTimes(1)
    pick.mockReturnValue('cause')
    tap(graph)
    expect(select).toHaveBeenLastCalledWith(null)
    expect(roots.get(graph)?.querySelector('[aria-live]')?.textContent).toBe('')
    tap(graph)
    expect(show).toHaveBeenCalledTimes(2)
  })

  it('opens Enter/Space once, changes type, and preserves the existing click event payload', () => {
    const show = vi.spyOn(GraphPresentationService.prototype, 'show')
    const graph = createGraph()
    const click = vi.fn()
    graph.nodes = presented
    graph.addEventListener(SINAPSI_NODE_CLICK_EVENT, click)
    const list = listOf(graph)
    list.focus()
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', repeat: true }))
    expect(click).toHaveBeenCalledTimes(1)
    expect(show).toHaveBeenCalledTimes(1)
    expect(roots.get(graph)?.querySelector('[role="group"]')?.getAttribute('data-type')).toBe(
      'card'
    )
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    list.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
    expect(click).toHaveBeenCalledTimes(2)
    expect((click.mock.calls[1][0] as CustomEvent).detail).toEqual({
      id: 'pricing',
      event: 'click',
      payload: { kind: 'pricing' }
    })
    expect(roots.get(graph)?.querySelector('[role="group"]')?.getAttribute('data-type')).toBe(
      'tooltip'
    )
  })

  it('isolates popup pointer events from canvas picking inside a closed shadow root', () => {
    const pick = vi.spyOn(CanvasRendererService.prototype, 'pick').mockReturnValue('cause')
    const graph = createGraph()
    graph.nodes = presented
    tap(graph)
    const popup = roots.get(graph)?.querySelector('[role="group"]') as HTMLElement
    pick.mockClear()
    popup.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
    popup.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true }))
    popup.dispatchEvent(new Event('scroll', { bubbles: true, composed: true }))
    expect(pick).not.toHaveBeenCalled()
    expect(listOf(graph).querySelector('[aria-selected="true"]')?.textContent).toBe('Drift cause')
  })

  it('closes outside without stealing focus, while its close button returns focus and local Escape closes', () => {
    vi.spyOn(CanvasRendererService.prototype, 'pick').mockReturnValue('cause')
    const graph = createGraph()
    graph.nodes = presented
    tap(graph)
    const outside = document.createElement('button')
    document.body.append(outside)
    outside.focus()
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
    expect(document.activeElement).toBe(outside)
    expect(listOf(graph).querySelector('[aria-selected="true"]')).toBeNull()
    tap(graph)
    const close = roots.get(graph)?.querySelector('[part="close"]') as HTMLElement
    close.click()
    expect(roots.get(graph)?.activeElement).toBe(listOf(graph))
    tap(graph)
    listOf(graph).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true })
    )
    expect(listOf(graph).querySelector('[aria-selected="true"]')).toBeNull()
  })

  it('updates localized content without reopening, closes removed nodes and leaves legacy clicks without a popup', () => {
    const pick = vi.spyOn(CanvasRendererService.prototype, 'pick').mockReturnValue('cause')
    const graph = createGraph()
    graph.nodes = presented
    tap(graph)
    const announce = roots.get(graph)?.querySelector('[aria-live]') as HTMLElement
    const firstAnnouncement = announce.textContent
    graph.nodes = {
      graph: [
        { ...presented.graph[0], presentation: { type: 'card', title: 'Traduzido' } },
        presented.graph[1]
      ]
    }
    expect(announce.textContent).toBe(firstAnnouncement)
    expect(roots.get(graph)?.querySelector('[part="title"]')?.textContent).toBe('Traduzido')
    expect(listOf(graph).querySelector('[aria-selected="true"]')).not.toBeNull()
    graph.nodes = { graph: [{ ...sample.graph[1], links: [] }] }
    expect(listOf(graph).querySelector('[aria-selected="true"]')).toBeNull()
    expect(announce.textContent).toBe('')
    const select = vi.spyOn(GraphAnimationService.prototype, 'selectNode')
    pick.mockReturnValue('pricing')
    tap(graph)
    expect(select).toHaveBeenLastCalledWith('pricing', true)
    expect(announce.textContent).toBe('')
  })

  it('localizes the listbox and close button and cancels a touch scroll gesture', () => {
    vi.spyOn(CanvasRendererService.prototype, 'pick').mockReturnValue('cause')
    const show = vi.spyOn(GraphPresentationService.prototype, 'show')
    const graph = createGraph()
    graph.nodes = presented
    graph.setAttribute('aria-label', 'Relações do produto')
    graph.setAttribute('close-label', 'Fechar')
    expect(listOf(graph).getAttribute('aria-label')).toBe('Relações do produto')
    expect(roots.get(graph)?.querySelector('[part="close"]')?.getAttribute('aria-label')).toBe(
      'Fechar'
    )
    canvasOf(graph).dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch' }))
    canvasOf(graph).dispatchEvent(new PointerEvent('pointercancel', { pointerType: 'touch' }))
    canvasOf(graph).dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch' }))
    expect(show).not.toHaveBeenCalled()
  })

  it('keeps Escape scoped to its instance and restores focus when presentation data disappears', () => {
    vi.spyOn(CanvasRendererService.prototype, 'pick').mockReturnValue('cause')
    const one = createGraph()
    const two = createGraph()
    one.nodes = presented
    two.nodes = presented
    tap(one)
    tap(two)
    listOf(two).focus()
    listOf(two).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true })
    )
    expect(listOf(one).querySelector('[aria-selected="true"]')).not.toBeNull()
    expect(listOf(two).querySelector('[aria-selected="true"]')).toBeNull()
    const close = roots.get(one)?.querySelector('[part="close"]') as HTMLElement
    close.focus()
    one.nodes = sample
    expect(roots.get(one)?.activeElement).toBe(listOf(one))
    expect(listOf(one).querySelector('[aria-selected="true"]')).toBeNull()
  })

  it('clears selection and transient focus when clicking nonfocusable content outside', () => {
    vi.spyOn(CanvasRendererService.prototype, 'pick').mockReturnValue('cause')
    const focus = vi.spyOn(GraphAnimationService.prototype, 'setFocusedId')
    const select = vi.spyOn(GraphAnimationService.prototype, 'selectNode')
    const graph = createGraph()
    graph.nodes = presented
    listOf(graph).focus()
    tap(graph)
    const outside = document.createElement('div')
    document.body.append(outside)
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
    expect(roots.get(graph)?.activeElement).toBeNull()
    expect(focus).toHaveBeenLastCalledWith(null)
    expect(select).toHaveBeenLastCalledWith(null)
    expect(listOf(graph).querySelector('[aria-selected="true"]')).toBeNull()
  })
})

describe('factory/programmatic-activation', () => {
  beforeAll(() => {
    defineSinapsi()
  })
  const documentData = {
    graph: [
      { id: 'a', name: 'A', payload: {}, links: [{ id: 'b', name: 'B' }] },
      { id: 'b', name: 'B', payload: {}, links: [{ id: 'c', name: 'C' }] },
      { id: 'c', name: 'C', payload: {}, links: [] }
    ]
  }

  afterEach(() => {
    document.body.replaceChildren()
    vi.restoreAllMocks()
  })
  it('normalizes activation against initial nodes markup before the nodes callback', () => {
    const graph = document.createElement('sinaps-i') as SinapsiElement
    const getAttribute = graph.getAttribute.bind(graph)
    // Browsers expose all initial attributes before upgrade callbacks. Happy DOM
    // does not deliver those callbacks, so model only its initial nodes read here.
    const attribute = vi
      .spyOn(graph, 'getAttribute')
      .mockImplementation((name) =>
        name === 'nodes' ? serializeNodesDocument(documentData) : getAttribute(name)
      )
    graph.setAttribute('active-node-ids', '["a","c"]')
    expect(graph.activeNodeIds).toEqual(['a', 'c'])
    expect(graph.getAttribute('active-node-ids')).toBe('["a","c"]')
    attribute.mockRestore()
    graph.nodes = documentData
    expect(graph.nodes).toEqual(documentData)
    expect(graph.activeNodeIds).toEqual(['a', 'c'])
  })

  it('continues pruning property activation written before a semantic graph exists', () => {
    const graph = document.createElement('sinaps-i') as SinapsiElement
    graph.activeNodeIds = ['a']
    expect(graph.activeNodeIds).toEqual([])
    graph.nodes = documentData
    expect(graph.activeNodeIds).toEqual([])
  })

  it('reflects deduplicated IDs, preserves valid state after invalid input, prunes replacement', () => {
    const graph = document.createElement('sinaps-i') as SinapsiElement
    graph.nodes = documentData
    document.body.append(graph)
    graph.activeNodeIds = ['a', 'c', 'a', 'unknown']
    expect(graph.activeNodeIds).toEqual(['a', 'c'])
    expect(graph.getAttribute('active-node-ids')).toBe('["a","c"]')
    const snapshot = graph.activeNodeIds
    expect(snapshot).not.toBe(graph.activeNodeIds)
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    graph.setAttribute('active-node-ids', '[1]')
    expect(graph.activeNodeIds).toEqual(['a', 'c'])
    graph.setAttribute('active-node-ids', 'bad-json')
    expect(graph.getAttribute('active-node-ids')).toBe('["a","c"]')
    expect(error).toHaveBeenCalled()
    graph.nodes = { graph: [{ id: 'a', name: 'A', payload: {}, links: [] }] }
    expect(graph.activeNodeIds).toEqual(['a'])
    graph.removeAttribute('active-node-ids')
    expect(graph.activeNodeIds).toEqual([])
  })
  it('highlights exactly supplied nodes and incident-edge IDs without events, focus, selection or labels', () => {
    const render = vi.spyOn(CanvasRendererService.prototype, 'render')
    const graph = document.createElement('sinaps-i') as SinapsiElement
    graph.nodes = documentData
    document.body.append(graph)
    const click = vi.fn(),
      hover = vi.fn()
    graph.addEventListener('sinapsi-node-click', click)
    graph.addEventListener('sinapsi-node-hover', hover)
    const focused = document.activeElement
    graph.activeNodeIds = ['a', 'c']
    const frame = render.mock.calls.at(-1)?.[0]
    expect(frame?.nodes.filter((node) => node.emphasized).map((node) => node.id)).toEqual([
      'a',
      'c'
    ])
    expect(frame?.programmaticIds).toEqual(new Set(['a', 'c']))
    expect(frame?.nodes.every((node) => !node.selected && !node.focused && !node.labeled)).toBe(
      true
    )
    expect(document.activeElement).toBe(focused)
    expect(click).not.toHaveBeenCalled()
    expect(hover).not.toHaveBeenCalled()
    expect(graph.move).toBe('rotate')
    graph.remove()
    document.body.append(graph)
    expect(graph.activeNodeIds).toEqual(['a', 'c'])
    graph.nodes = null
    expect(graph.activeNodeIds).toEqual([])
  })
  it('updates a reduced-motion instance through public properties without a frame subscription', () => {
    let changed: (() => void) | undefined
    const media = {
      matches: true,
      addEventListener: vi.fn((_event: string, callback: () => void) => {
        changed = callback
      }),
      removeEventListener: vi.fn()
    }
    vi.stubGlobal('matchMedia', () => media)
    const schedule = vi.spyOn(frame, 'update')
    const render = vi.spyOn(CanvasRendererService.prototype, 'render')
    const graph = document.createElement('sinaps-i') as SinapsiElement
    graph.nodes = documentData
    document.body.append(graph)
    const before = render.mock.calls.at(-1)?.[0].nodes.map(({ x, y }) => ({ x, y }))
    graph.activeNodeIds = ['a']
    graph.palette = { primary: '#ff9500' }
    graph.move = 'pulse'
    const painted = render.mock.calls.at(-1)?.[0]
    expect(painted?.nodes.map(({ x, y }) => ({ x, y }))).toEqual(before)
    expect(painted?.nodes.filter((node) => node.emphasized).map((node) => node.id)).toEqual(['a'])
    expect(painted?.reveal).toBe(1)
    expect(painted?.pulse).toBe(0)
    expect(schedule).not.toHaveBeenCalled()
    media.matches = false
    changed?.()
    expect(schedule).toHaveBeenCalledTimes(1)
    graph.remove()
    expect(media.removeEventListener).toHaveBeenCalledTimes(1)
  })
})
