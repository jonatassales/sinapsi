import source from '@configuration'
import { deepFreeze } from '@core/lib/deep-freeze.compute'
import type { SinapsiConfiguration } from '@domain/kernel/config.types'
import type { SinapsiColorKey } from '@domain/kernel/properties.types'
import { configurationSchema } from '@domain/schemas/configuration.schema'

/** Runtime configuration validated and frozen once from the canonical JSON. */
export const sinapsiConfiguration: SinapsiConfiguration = deepFreeze(
  configurationSchema.parse(source)
)

export const SINAPSI_TAG_NAME = sinapsiConfiguration.component.tagName

export const SINAPSI_LIMITS = sinapsiConfiguration.component.limits

export const DEFAULT_SINAPSI_MOVE = sinapsiConfiguration.component.defaults.move

export const DEFAULT_SINAPSI_SPEED = sinapsiConfiguration.component.defaults.speed

export const DEFAULT_SINAPSI_NODES = sinapsiConfiguration.component.defaults.nodes

export const DEFAULT_SINAPSI_PALETTE = sinapsiConfiguration.palette

export const SINAPSI_COLOR_KEYS = [
  'primary',
  'text',
  'muted'
] as const satisfies readonly SinapsiColorKey[]

export const SINAPSI_COLOR_ATTRIBUTES = {
  primary: 'color-primary',
  text: 'color-text',
  muted: 'color-muted'
} as const satisfies Record<SinapsiColorKey, `color-${SinapsiColorKey}`>

export const SINAPSI_PROPERTY_ATTRIBUTES = ['move', 'speed', 'nodes'] as const

export const SINAPSI_OBSERVED_ATTRIBUTES: readonly string[] = [
  ...SINAPSI_COLOR_KEYS.map((key) => SINAPSI_COLOR_ATTRIBUTES[key]),
  ...SINAPSI_PROPERTY_ATTRIBUTES,
  'aria-label',
  'close-label',
  'active-node-ids'
]
