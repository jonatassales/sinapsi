<h1 align="center">Sinapsi</h1>

<p align="center"><strong>Your product vision drifts on a living graph</strong></p>

<p align="center">
  <img src="./assets/images/readme-banner.png" alt="Sinapsi network graph component" width="100%">
</p>

<p align="center">
  <a href="https://paladini.io/harness-score/guide/maturity-model.html"><img alt="Harness Score L4" src="https://paladini.github.io/harness-score/maturity/badge-l4.svg" height="20"></a>
  <a href="https://github.com/jonatassales/sinapsi/actions/workflows/ci.yml"><img alt="Tests" src="https://img.shields.io/github/actions/workflow/status/jonatassales/sinapsi/ci.yml?branch=main&label=tests&logo=github" height="20"></a>
  <a href="https://www.npmjs.com/package/sinapsi"><img alt="npm version" src="https://img.shields.io/npm/v/sinapsi?logo=npm" height="20"></a>
</p>

<p align="center">
  <a href="https://github.com/jonatassales/sinapsi"><strong>Documentation</strong></a>&nbsp;&nbsp;&nbsp;
  <a href="https://www.npmjs.com/package/sinapsi"><strong>npm</strong></a>&nbsp;&nbsp;&nbsp;
  <a href="./LICENSE"><strong>MIT License</strong></a>
</p>

<br>

## Overview

`sinapsi` is a framework-agnostic, SSR-safe Web Component that renders a 3D
plexus with an Obsidian palette. The public UI is a single native
`<sinaps-i>` element: a transparent host, a three-color palette, idle / rotate /
pulse motion, and optional semantic JSON nodes.

Your application keeps ownership of layout, surrounding UI, and product logic.
Sinapsi does not ship a background token, a persona, or a framework wrapper.

| Capability | What Sinapsi provides |
| --- | --- |
| Native Web Component | One `<sinaps-i>` element for React, Next.js, Vue, Svelte, Angular, vanilla JS, and mixed stacks |
| Transparent host | `inline-block` 16rem canvas with no packaged background color |
| Palette | `color-primary`, `color-text`, and `color-muted` |
| Motion | `idle`, `rotate` (default), and `pulse`; pointer-over freezes as idle |
| Nodes | Omit `nodes` for a generated decorative graph; pass `{ "graph": SinapsiNode[] }` for semantic ids, links, hover, and click |
| Neighborhood lighting | Hover and click light the undirected one-level neighborhood; click draws each `name` inside those discs |
| SSR safety | Core imports do not require browser globals |

> [!IMPORTANT]
> There is no public `activation` fill. Decorative omitted-`nodes` graphs stay
> muted. Semantic hover and click light the one-level neighborhood only.

## Install

```bash
npm install sinapsi
```

```bash
pnpm add sinapsi
```

```bash
yarn add sinapsi
```

```bash
bun add sinapsi
```

The element also ships as a standalone browser bundle for CDN use. See
[CDN](#cdn).

## Quick start

Register `<sinaps-i>` from browser-only code:

```ts
import 'sinapsi/browser'
```

Then use it as a native element:

```html
<sinaps-i
  role="img"
  aria-label="Network graph"
  move="rotate"
  speed="1"
  color-primary="#F97316"
  color-text="#F5F5F5"
  color-muted="#A1A1AA"
></sinaps-i>
```

That is enough for a decorative graph: Sinapsi generates the topology, tumbles
it in 3D, and keeps every disc muted.

> [!NOTE]
> Import `sinapsi/browser` only inside a browser or client boundary. The core
> `sinapsi` entry is safe to import during SSR and does not register the
> element.

## Usage

`<sinaps-i>` is a native custom element. After registration it works like any
other HTML tag: attributes in markup, properties and events in JavaScript.

### Decorative graph

Omit `nodes` when the graph is visual identity rather than data. Sinapsi
generates a scale-free cloud (170 nodes), keeps it muted, and does not emit
node events or expose a keyboard listbox.

```html
<sinaps-i
  role="img"
  aria-label="Decorative network"
  move="rotate"
  speed="1"
></sinaps-i>
```

Use `idle` when the mark should sit still, or `pulse` when the whole cloud
should compact and expand:

```html
<sinaps-i move="idle" aria-hidden="true"></sinaps-i>
<sinaps-i move="pulse" speed="0.8" aria-label="Network pulse"></sinaps-i>
```

### Semantic graph

Pass a `{ graph }` document when nodes have meaning. Each node needs a unique
`id`, a visible `name`, an opaque `payload` object, and `links` to other nodes
in the same document.

```ts
import type { SinapsiElement, SinapsiGraphDocument } from 'sinapsi'
import 'sinapsi/browser'

const nodes: SinapsiGraphDocument = {
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
    },
    {
      id: 'latency',
      name: 'Latency',
      payload: { kind: 'symptom', weight: 0.8 },
      links: [{ id: 'cause', name: 'Drift cause' }]
    }
  ]
}

const graph = document.querySelector<SinapsiElement>('sinaps-i')!
graph.nodes = nodes
```

The same document can be set as the `nodes` HTML attribute. The attribute value
is JSON:

```html
<sinaps-i
  role="img"
  aria-label="Incident graph"
  nodes='{"graph":[{"id":"cause","name":"Drift cause","payload":{"kind":"cause"},"links":[{"id":"pricing","name":"Pricing"}]},{"id":"pricing","name":"Pricing","payload":{"kind":"pricing"},"links":[{"id":"cause","name":"Drift cause"}]}]}'
></sinaps-i>
```

Prefer the JavaScript property for anything beyond a tiny document. The property
accepts the object or its JSON string:

```ts
graph.nodes = nodes
graph.nodes = JSON.stringify(nodes)
```

Assign `null` or `undefined` to drop the document and return to the generated
decorative graph:

```ts
graph.nodes = null
```

### Live property updates

Attributes are the source of truth. Getters read and normalize them; setters
write normalized values back.

```ts
import type { SinapsiElement } from 'sinapsi'
import 'sinapsi/browser'

const graph = document.querySelector<SinapsiElement>('sinaps-i')!

graph.move = 'pulse'
graph.speed = 1.2
graph.palette = {
  primary: '#38BDF8',
  text: '#F8FAFC',
  muted: '#64748B'
}

graph.addEventListener('sinapsi-node-hover', (event) => {
  const { id, payload } = event.detail
  console.log('hover', id, payload)
})

graph.addEventListener('sinapsi-node-click', (event) => {
  const { id, event: kind, payload } = event.detail
  console.log(id, kind, payload)
})
```

Setting `move` or `speed` to `null` / `undefined` removes that attribute and
restores the default (`rotate` and `1`).

### Vanilla HTML page

Without a bundler, load the standalone bundle and drop in the element:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Sinapsi</title>
    <style>
      html,
      body {
        margin: 0;
        min-height: 100%;
        background: #09090b;
      }

      sinaps-i {
        width: 20rem;
        height: 20rem;
      }
    </style>
  </head>
  <body>
    <sinaps-i
      role="img"
      aria-label="Network graph"
      move="rotate"
      color-primary="#F97316"
      color-text="#F5F5F5"
      color-muted="#A1A1AA"
    ></sinaps-i>
    <script type="module" src="https://cdn.jsdelivr.net/npm/sinapsi/dist/standalone/sinapsi.js"></script>
  </body>
</html>
```

With a bundler, replace the script tag with `import 'sinapsi/browser'`.

## Web Component API

### HTML attributes

| Attribute | Values | Default | Purpose |
| --- | --- | --- | --- |
| `move` | `idle`, `rotate`, `pulse` | `rotate` | Select the idle animation |
| `speed` | Number in `[0.1, 10]` | `1` | Scale animation speed |
| `nodes` | JSON `{ "graph": SinapsiNode[] }` | omitted | Semantic graph; omit for the generated decorative graph |
| `color-primary` | Hex CSS color | `#F97316` | Neighborhood node fill |
| `color-text` | Hex CSS color | `#F5F5F5` | In-disc names and residual highlights |
| `color-muted` | Hex CSS color | `#A1A1AA` | Inactive node fill |

Observed attributes are exactly those six names. There is no `activation`,
`color-background`, or size attribute.

Invalid `move`, `speed`, and color attributes log
`[Sinapsi] Invalid … Using …` and recover to the package default. They never
throw from the element boundary.

- `move="spin"` becomes `rotate`.
- `speed="0"` or `speed="11"` becomes `1`.
- `color-primary="orange"` becomes `#F97316`.
- Hex values may be `#RGB`, `#RGBA`, `#RRGGBB`, or `#RRGGBBAA` and are trimmed.

Invalid `nodes` JSON logs
`[Sinapsi] Invalid nodes … Keeping previous graph.` and does not apply a
partial document. If a previous document exists, the attribute is rewritten to
that snapshot. If none exists, the attribute is removed.

### JavaScript properties

The element reflects the same presentation controls. The TypeScript surface is
`SinapsiElement`.

| Property | Type | Notes |
| --- | --- | --- |
| `move` | `'idle' \| 'rotate' \| 'pulse'` | Getter returns the normalized move. Setter writes the attribute; `null` / `undefined` removes it. |
| `speed` | `number` | Unitless multiplier in `[0.1, 10]`. Setter writes the normalized number; `null` / `undefined` removes the attribute. |
| `nodes` | `SinapsiGraphDocument \| null` | Last accepted `{ graph }` snapshot, or `null` when decorative. Setter accepts that document, its JSON string, or `null` / `undefined` to clear. |
| `palette` | `{ primary, text, muted }` | Getter returns the resolved three-token object. Setter accepts a partial override; omitted tokens fall back to the package defaults. |

```ts
import type { SinapsiElement, SinapsiPalette } from 'sinapsi'

const graph = document.querySelector<SinapsiElement>('sinaps-i')!

const move = graph.move
const speed = graph.speed
const palette: SinapsiPalette = graph.palette
const snapshot = graph.nodes
```

The `nodes` getter returns a structured clone. Mutating the object you passed
in, or the object you read back, does not change the live graph. Write
`graph.nodes = nextDocument` to replace the document.

`parseNodesDocument` and `serializeNodesDocument` are the public parse /
stringify helpers:

```ts
import { parseNodesDocument, serializeNodesDocument } from 'sinapsi'

const parsed = parseNodesDocument('{"graph":[]}')
if (parsed.ok) {
  const json = serializeNodesDocument(parsed.document)
  console.log(json)
}
```

### Semantic nodes document

The `nodes` value is always this shape:

```ts
interface SinapsiLink {
  id: string
  name: string
}

interface SinapsiNode {
  id: string
  name: string
  payload: Record<string, unknown>
  links: SinapsiLink[]
}

interface SinapsiGraphDocument {
  graph: SinapsiNode[]
}
```

Rules the document must satisfy:

| Rule | Detail |
| --- | --- |
| Wrapper | The root key is `graph`. `{ "nodes": [] }` is rejected. |
| Size | `0`–`400` nodes. An empty `{ "graph": [] }` is valid. |
| Identity | Every `id` is a non-empty string and unique in the document. |
| Name | Every `name` is a non-empty string. |
| Payload | An object. Use `{}` when you have nothing to attach. The value is opaque to Sinapsi. |
| Links | Each link is `{ id, name }`. `id` must name another node in the same document. Self-links and dangling ids are rejected. |
| Layout | Only `link.id` is used as an undirected edge. Link `name` is metadata. |

```ts
const invalid = {
  graph: [
    {
      id: 'alone',
      name: 'Alone',
      payload: {},
      links: [{ id: 'missing', name: 'Missing' }]
    }
  ]
}

graph.nodes = invalid
// console: [Sinapsi] Invalid nodes=... Keeping previous graph.
```

### Events

Hovering a semantic node highlights it, its one-level neighbors (including
inbound reverse links), and the connecting edges. Clicking it activates that
neighborhood until another node is clicked and draws each `name` centered
inside those discs. Hover does not draw names.

Hover and click always dispatch host events when a semantic node is under the
pointer or keyboard selection:

| Event | Constant | When |
| --- | --- | --- |
| `sinapsi-node-hover` | `SINAPSI_NODE_HOVER_EVENT` | Pointer or keyboard focus enters a node |
| `sinapsi-node-click` | `SINAPSI_NODE_CLICK_EVENT` | Pointer click, or Enter / Space on the focused option |

```ts
import {
  SINAPSI_NODE_CLICK_EVENT,
  SINAPSI_NODE_HOVER_EVENT,
  type SinapsiNodeClickEvent,
  type SinapsiNodeHoverEvent
} from 'sinapsi'

graph.addEventListener(SINAPSI_NODE_HOVER_EVENT, (event: SinapsiNodeHoverEvent) => {
  console.log(event.detail.id, event.detail.payload)
})

graph.addEventListener(SINAPSI_NODE_CLICK_EVENT, (event: SinapsiNodeClickEvent) => {
  const { id, event: kind, payload } = event.detail
  console.log(id, kind, payload)
})
```

Events bubble and compose from the host. Detail is always
`{ id, event: 'click' | 'hover', payload }`.

- Programmatic `nodes` writes do not emit.
- Empty space does not emit and does not clear the click neighborhood.
- Decorative omitted-`nodes` graphs never emit.
- Hover fires once per enter, not on every pointer move inside the same disc.

## Motion and activation

`idle` holds the projected graph still. `rotate` tumbles the cloud on a random
3D axis that keeps precessing, so the motion visits every direction. `pulse`
compacts and expands the whole cloud with a heartbeat lub-dub. `speed`
multiplies those motions (`1` is the reference pace).

Motion freezes as idle — without writing the `move` attribute — when:

- the pointer is over the host
- the semantic listbox has focus
- the user has `prefers-reduced-motion: reduce`

There is no public `activation` fill. Decorative omitted-`nodes` graphs stay
muted. A semantic document lights the hovered or clicked one-level
neighborhood, including connecting edges. Click also paints `node.name`
inside every activated disc. Node discs are never stroked.

## Palette

The host is transparent. Supply contrast in the surrounding page. Use
`color-primary` for neighborhood nodes, `color-text` for in-disc names, and
`color-muted` for inactive nodes. There is no `color-background` token.

```html
<body style="background:#09090B">
  <sinaps-i
    color-primary="#F97316"
    color-text="#F5F5F5"
    color-muted="#A1A1AA"
    aria-label="Network graph"
  ></sinaps-i>
</body>
```

Or set the three tokens together from JavaScript:

```ts
graph.palette = { primary: '#F97316', text: '#F5F5F5', muted: '#A1A1AA' }
```

A partial write fills missing tokens from the package defaults, not from the values already on the element:

```ts
graph.palette = { primary: '#38BDF8' }
```

## Host size and styling

The host is `inline-block`, `16rem` by `16rem`, with a transparent background.
Host styles use `:where(:host)`, so page CSS can override size without fighting
specificity:

```css
sinaps-i {
  width: 24rem;
  height: 24rem;
}
```

The visual tree is a **closed** Shadow DOM. `className`, descendant selectors,
and inherited theme variables cannot style discs, edges, or labels inside the
shadow tree. Wrap the host when you need page-layout styling:

```html
<div class="hero-mark">
  <sinaps-i aria-label="Network graph"></sinaps-i>
</div>
```

The canvas tracks host size through `ResizeObserver`. Changing the host box
rescales the projection.

## React and Next.js

Import the type augmentation from a client module:

```ts
import 'sinapsi/react-types'
import 'sinapsi/browser'
```

Then render:

```tsx
export function NetworkMark() {
  return (
    <sinaps-i
      move="rotate"
      color-primary="#F97316"
      aria-label="Network graph"
    />
  )
}
```

In the Next.js App Router, keep registration on the client:

```tsx
'use client'

import 'sinapsi/react-types'
import 'sinapsi/browser'

export function NetworkMark() {
  return <sinaps-i move="pulse" aria-label="Network graph" />
}
```

`className` cannot style the closed shadow tree. Wrap the host when you need
page-layout styling.

Semantic documents and events from a ref:

```tsx
'use client'

import { useEffect, useRef } from 'react'
import type { SinapsiElement, SinapsiGraphDocument } from 'sinapsi'
import 'sinapsi/react-types'
import 'sinapsi/browser'

const nodes: SinapsiGraphDocument = {
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

export function IncidentGraph() {
  const ref = useRef<SinapsiElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) {
      return
    }

    element.nodes = nodes
    const onClick = (event: Event) => {
      const detail = (event as CustomEvent).detail
      console.log(detail.id, detail.payload)
    }
    element.addEventListener('sinapsi-node-click', onClick)
    return () => element.removeEventListener('sinapsi-node-click', onClick)
  }, [])

  return <sinaps-i ref={ref} move="rotate" aria-label="Incident graph" />
}
```

## Vue, Svelte, and Angular

The element is a native custom element. Framework wrappers are not required.

**Vue 3** — tell the compiler that `sinaps-i` is a custom element, then import
the browser entry once:

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === 'sinaps-i'
        }
      }
    })
  ]
})
```

```vue
<script setup lang="ts">
import type { SinapsiElement, SinapsiGraphDocument } from 'sinapsi'
import { onMounted, ref } from 'vue'
import 'sinapsi/browser'

const el = ref<SinapsiElement | null>(null)
const nodes: SinapsiGraphDocument = {
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

onMounted(() => {
  if (el.value) {
    el.value.nodes = nodes
  }
})
</script>

<template>
  <sinaps-i ref="el" move="rotate" color-primary="#F97316" aria-label="Network graph" />
</template>
```

**Svelte** — import the browser entry and use the tag:

```svelte
<script lang="ts">
  import type { SinapsiElement, SinapsiGraphDocument } from 'sinapsi'
  import { onMount } from 'svelte'
  import 'sinapsi/browser'

  let graph: SinapsiElement
  const nodes: SinapsiGraphDocument = { graph: [] }

  onMount(() => {
    graph.nodes = nodes
  })
</script>

<sinaps-i bind:this={graph} move="pulse" aria-label="Network graph"></sinaps-i>
```

**Angular** — allow custom elements on the consuming module or standalone
component, and register from a browser entry such as `main.ts`:

```ts
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core'

@NgModule({
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule {}
```

```ts
import 'sinapsi/browser'
```

```html
<sinaps-i move="rotate" color-primary="#F97316" aria-label="Network graph"></sinaps-i>
```

## SSR and browser registration

The core package is safe to import when `HTMLElement` and `customElements` are
not available:

```ts
import type { SinapsiElement, SinapsiGraphDocument } from 'sinapsi'
```

Register the element only inside a browser/client boundary:

```ts
await import('sinapsi/browser')
```

If you prefer explicit registration instead of the browser side-effect entry:

```ts
import { defineSinapsi } from 'sinapsi'

defineSinapsi()
```

`defineSinapsi()` defines `<sinaps-i>` once and safely returns without
registering in a non-browser environment.

## CDN

The standalone bundle inlines runtime dependencies and registers `<sinaps-i>`
when the script loads:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/sinapsi/dist/standalone/sinapsi.js"></script>

<sinaps-i
  role="img"
  aria-label="Network graph"
  move="rotate"
  color-primary="#F97316"
></sinaps-i>
```

unpkg resolves the same file:

```html
<script type="module" src="https://unpkg.com/sinapsi"></script>
```

Pin a version in production (`sinapsi@0.1.1`) so the mark does not change under
you.

## Accessibility

The animated canvas stays `aria-hidden`. When a valid semantic `nodes`
document is showing, a visually hidden listbox sibling exposes node names:
one tab stop, arrow keys move, Enter or Space activates the click path.
Decorative mode has no listbox.

- For a meaningful visual identity, provide an appropriate role and accessible name.
- For a decorative graph, hide the host from assistive technology.
- Do not use animation or palette changes as the only way to communicate meaning.
- Do not put the semantic listbox under an `aria-hidden` ancestor.

```html
<!-- Meaningful decorative mark -->
<sinaps-i role="img" aria-label="Product network"></sinaps-i>

<!-- Purely decorative -->
<sinaps-i aria-hidden="true"></sinaps-i>

<!-- Semantic data: host name plus the built-in listbox -->
<sinaps-i role="img" aria-label="Incident graph"></sinaps-i>
```

## Package entry points

| Import | Purpose |
| --- | --- |
| `sinapsi` | Types, constants, factories, and explicit registration API |
| `sinapsi/browser` | Main API plus automatic browser registration |
| `sinapsi/react-types` | React JSX type augmentation |
| `sinapsi/standalone` | Direct-browser/CDN bundle |
| `sinapsi/index.css` | Explicit stylesheet export |

The element already inlines its host and canvas styles in the closed shadow
tree. You do not need `sinapsi/index.css` to render `<sinaps-i>`.

## License

[MIT](./LICENSE) © Neongate AI
