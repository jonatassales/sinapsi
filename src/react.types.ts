import type { SinapsiElement } from '@domain/kernel/element.types'
import type { SinapsiGraphDocument } from '@domain/kernel/nodes.types'
import type { SinapsiMove, SinapsiPaletteOverrides } from '@domain/kernel/properties.types'
import type { DetailedHTMLProps, HTMLAttributes } from 'react'

export interface SinapsiReactAttributes {
  'close-label'?: string
  'color-muted'?: string
  'color-primary'?: string
  'color-text'?: string
  'active-node-ids'?: string
  activeNodeIds?: readonly string[]
  move?: SinapsiMove
  nodes?: string | SinapsiGraphDocument
  palette?: SinapsiPaletteOverrides
  speed?: number | string
}

type SinapsiReactHostProps = DetailedHTMLProps<HTMLAttributes<SinapsiElement>, SinapsiElement>

export type SinapsiReactIntrinsicProps = SinapsiReactHostProps & SinapsiReactAttributes

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'sinaps-i': SinapsiReactIntrinsicProps
    }
  }
}
