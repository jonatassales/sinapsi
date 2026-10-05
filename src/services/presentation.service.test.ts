import type { SinapsiNode } from '@domain/kernel/nodes.types'
import type { RenderFrame } from '@domain/kernel/render.types'
import { sinapsiShadowTreeFactory } from '@factories/shadow-tree.factory'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GraphPresentationService } from './presentation.service'

const card: SinapsiNode = {
  id: 'one',
  name: 'Node name',
  payload: {},
  links: [],
  presentation: {
    type: 'card',
    title: '<script>safe</script>',
    description: 'Details',
    reference: '#abc',
    badge: '-3 drift'
  }
}

function setup() {
  const host = document.createElement('div')
  document.body.append(host)
  const tree = sinapsiShadowTreeFactory(host.attachShadow({ mode: 'open' }), document)
  tree.syncOptions({ graph: [card] })
  const hostRect = vi
    .spyOn(host, 'getBoundingClientRect')
    .mockReturnValue(new DOMRect(10, 10, 600, 400))
  const canvasRect = vi
    .spyOn(tree.canvas, 'getBoundingClientRect')
    .mockImplementation(() => host.getBoundingClientRect())
  Object.defineProperty(tree.canvas, 'clientWidth', { value: 600 })
  Object.defineProperty(tree.canvas, 'clientHeight', { value: 400 })
  vi.spyOn(tree.presentation, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 240, 130))
  const service = new GraphPresentationService(host, tree)
  service.connect()
  return { host, tree, service, hostRect, canvasRect }
}

function frame(x = 240, y = 200): RenderFrame {
  return {
    activeId: 'one',
    edges: [],
    pulse: 0,
    reveal: 1,
    nodes: [
      {
        id: 'one',
        name: 'Node',
        x,
        y,
        depth: 0.5,
        weight: 0.7,
        lit: 1,
        emphasized: true,
        dimmed: false,
        focused: false,
        selected: true,
        labeled: false
      }
    ]
  }
}

afterEach(() => vi.restoreAllMocks())

describe('service/presentation', () => {
  it('renders safe text with optional fields, keeps DOM stable on frames and avoids frame layout reads', () => {
    const { tree, service, canvasRect } = setup()
    service.show(card)
    service.update(frame())
    const title = tree.content.querySelector('[part="title"]')
    const reads = canvasRect.mock.calls.length
    expect(title?.textContent).toBe('<script>safe</script>')
    expect(tree.content.querySelector('script')).toBeNull()
    expect(tree.presentation.getAttribute('aria-labelledby')).toBe(title?.id)
    const first = tree.presentation.style.transform
    service.update(frame(260, 210))
    expect(tree.presentation.style.transform).not.toBe(first)
    expect(tree.content.querySelector('[part="title"]')).toBe(title)
    expect(canvasRect.mock.calls.length).toBe(reads)
    service.disconnect()
  })

  it('keeps tooltip description-only and uses the node name as its accessible identity', () => {
    const { tree, service } = setup()
    service.show({
      ...card,
      presentation: { type: 'tooltip', description: 'Only this description' }
    })
    service.update(frame())
    expect(tree.content.querySelector('[part="description"]')?.textContent).toBe(
      'Only this description'
    )
    expect(tree.content.querySelector('[part="title"]')).toBeNull()
    expect(tree.presentation.getAttribute('role')).toBe('group')
    expect(tree.presentation.getAttribute('aria-label')).toBe('Node name')
    expect(tree.close.isConnected).toBe(true)
    service.disconnect()
  })

  it('updates content without repeating the opening announcement or inventing missing fields', () => {
    const { tree, service } = setup()
    service.show(card)
    service.update(frame())
    const announcement = tree.live.textContent
    service.show(
      { ...card, presentation: { type: 'card', description: 'Localized description' } },
      false
    )
    expect(tree.live.textContent).toBe(announcement)
    expect(tree.content.querySelector('[part="title"]')).toBeNull()
    expect(tree.content.querySelector('[part="avatar"]')).toBeNull()
    expect(tree.content.querySelector('[part="description"]')?.textContent).toBe(
      'Localized description'
    )
    service.disconnect()
  })

  it('loads a safe avatar only when visible and removes a failed image without retrying', () => {
    const { tree, service } = setup()
    service.show({
      ...card,
      presentation: { type: 'card', title: 'Person', avatarUrl: 'https://example.com/avatar.webp' }
    })
    const avatar = tree.content.querySelector('img') as HTMLImageElement
    expect(avatar.hasAttribute('src')).toBe(false)
    service.update(frame())
    expect(avatar.src).toBe('https://example.com/avatar.webp')
    expect(avatar.alt).toBe('')
    avatar.dispatchEvent(new Event('error'))
    service.update(frame(250, 210))
    expect(tree.content.querySelector('img')).toBeNull()
    expect(tree.content.textContent).toBe('Person')
    service.disconnect()
  })

  it('loads replacement avatars while open and ignores stale image errors', () => {
    const { tree, service } = setup()
    service.show({
      ...card,
      presentation: { type: 'card', title: 'First', avatarUrl: 'https://example.com/first.webp' }
    })
    service.update(frame())
    const previous = tree.content.querySelector('img') as HTMLImageElement
    service.show(
      {
        ...card,
        presentation: {
          type: 'card',
          title: 'Second',
          avatarUrl: 'https://example.com/second.webp'
        }
      },
      false
    )
    const replacement = tree.content.querySelector('img') as HTMLImageElement
    expect(replacement.src).toBe('https://example.com/second.webp')
    expect(previous.onerror).toBeNull()
    previous.dispatchEvent(new Event('error'))
    expect(tree.content.querySelector('img')).toBe(replacement)
    service.disconnect()
  })

  it('hides an offscreen anchor, returns hidden focus without scrolling, and restores without reannouncement', () => {
    const { tree, service, hostRect } = setup()
    service.show(card)
    service.update(frame())
    const announcement = tree.live.textContent
    tree.close.focus()
    const focus = vi.spyOn(tree.listbox, 'focus')
    hostRect.mockReturnValue(new DOMRect(10, -500, 600, 400))
    service.invalidate()
    expect(tree.presentation.hidden).toBe(true)
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
    expect(service.openId).toBe('one')
    hostRect.mockReturnValue(new DOMRect(10, 10, 600, 400))
    service.invalidate()
    expect(tree.presentation.hidden).toBe(false)
    expect(tree.live.textContent).toBe(announcement)
    service.disconnect()
  })

  it('recomputes on geometry invalidation, handles CSS scaling without multiplying DPR, and cleans up', () => {
    const { tree, service, hostRect } = setup()
    service.show(card)
    service.update(frame())
    const first = tree.presentation.style.transform
    Object.defineProperty(globalThis, 'devicePixelRatio', { configurable: true, value: 2 })
    service.update(frame())
    expect(tree.presentation.style.transform).toBe(first)
    hostRect.mockReturnValue(new DOMRect(20, 20, 900, 600))
    service.invalidate()
    expect(tree.presentation.style.transform).not.toBe(first)
    service.disconnect()
    expect(service.openId).toBeNull()
    expect(tree.presentation.hidden).toBe(true)
    expect(tree.content.childElementCount).toBe(0)
  })
})
