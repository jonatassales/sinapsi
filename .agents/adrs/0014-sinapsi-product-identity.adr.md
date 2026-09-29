# ADR-0014: Sinapsi product identity

- Status: Accepted
- Created: 2026-09-17
- Updated: 2026-09-17
- Mode: Prospective

## Context

ADR-0001 established one native custom element with a closed shadow canvas and an
SSR-safe main entry. That boundary stays. The product name does not: Graphz is
replaced by Sinapsi.

HTML custom element names must include a hyphen. `sinapsi` alone cannot be
registered. The tag is `<sinap-si>`.

The POSIX engineering CLI is already named `graph` (ADR-0010). npm identity and
GitHub ownership remain independent (Rule 001).

## Decision

1. Publish `@neongate-ai/sinapsi`.
2. Register `<sinap-si>` as the only runtime UI element.
3. Name public types, factories, and diagnostics after Sinapsi.
4. Keep the engineering binary `graph`; the repository was renamed separately and
   now lives at `jonatassales/sinapsi`.
5. Do not re-export Graphz identifiers.

## Consequences

Install, registration, and JSX tag names all change together. Source paths still
must not begin with the product name except `src/sinapsi.config.json`. Future
GitHub or CLI renames need their own SPEC.

## Evidence

`package.json`, `src/sinapsi.config.json`, `src/index.ts`,
`src/services/registration.service.ts`, `.agents/specs/017-rename-product-to-sinapsi.spec.md`

## Related records

- SPEC: 017
- Rules: 001, 002, 011
- Supersedes: ADR-0001 product names only; the native-element boundary remains
