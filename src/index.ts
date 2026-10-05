export {
  DEFAULT_SINAPSI_MOVE,
  DEFAULT_SINAPSI_NODES,
  DEFAULT_SINAPSI_PALETTE,
  DEFAULT_SINAPSI_SPEED,
  SINAPSI_COLOR_ATTRIBUTES,
  SINAPSI_COLOR_KEYS,
  SINAPSI_LIMITS,
  SINAPSI_OBSERVED_ATTRIBUTES,
  SINAPSI_TAG_NAME,
  sinapsiConfiguration
} from '@core/config.data'
export { normalizeColor } from '@core/lib/normalize-color.compute'
export { normalizeMove } from '@core/lib/normalize-move.compute'
export { parseNodesDocument, serializeNodesDocument } from '@core/lib/normalize-nodes.compute'
export { normalizePalette } from '@core/lib/normalize-palette.compute'
export { normalizeSpeed } from '@core/lib/normalize-speed.compute'
export type {
  SinapsiElement,
  SinapsiElementConstructor,
  SinapsiNodePosition
} from '@domain/kernel/element.types'
export type {
  SinapsiGraphDocument,
  SinapsiLink,
  SinapsiNode,
  SinapsiNodeClickEvent,
  SinapsiNodeEventDetail,
  SinapsiNodeEventName,
  SinapsiNodeHoverEvent,
  SinapsiNodePresentation
} from '@domain/kernel/nodes.types'
export {
  SINAPSI_NODE_CLICK_EVENT,
  SINAPSI_NODE_EVENTS,
  SINAPSI_NODE_HOVER_EVENT,
  SinapsiNodeEvent
} from '@domain/kernel/nodes.types'
export type {
  SinapsiColorKey,
  SinapsiMove,
  SinapsiPalette,
  SinapsiPaletteOverrides,
  SinapsiProperties
} from '@domain/kernel/properties.types'
export { sinapsiElementClassFactory } from '@factories/element-class.factory'
export { defineSinapsi } from '@services/registration.service'
