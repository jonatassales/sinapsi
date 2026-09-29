# SPEC-017: Rename product identity to Sinapsi

- Status: Implemented
- Created: 2026-09-17
- Updated: 2026-09-17
- Mode: Prospective
- Owner: Sinapsi maintainers

## Problem

The published library is still branded Graphz (`@neongate-ai/graphz`, `<graph-z>`,
`defineGraphz`). The product name is now Sinapsi. Custom element names must
contain a hyphen, so the tag cannot be the bare word `sinapsi`.

## Scope

In scope: npm identity, custom-element tag, public TypeScript names, log prefix,
canonical JSON filename, dist filenames, consumer docs, audits, harness copy, and
the Cursor reviewer subagent.

Out of scope at the time: the separate GitHub repository rename, the engineering
CLI binary `graph`, topology types such as `Graph`/`createGraph`, and the local
checkout directory.

## Requirements

1. The npm package name is `@neongate-ai/sinapsi`.
2. The native tag is `sinap-si`.
3. Public exports use Sinapsi names (`defineSinapsi`, `SinapsiElement`,
   `SINAPSI_TAG_NAME`, `sinapsiConfiguration`).
4. Invalid properties log `[Sinapsi] Invalid … Using …`.
5. Canonical configuration lives at `src/sinapsi.config.json`.
6. Dist entries are `dist/sinapsi.js` and `dist/standalone/sinapsi.js`.
7. The engineering CLI remains `graph`; consumer setup installs `@neongate-ai/sinapsi`.
8. GitHub URLs followed the then-current repository until its separate rename;
   the current canonical location is `jonatassales/sinapsi`.
9. No compatibility aliases for the Graphz names; the package has not shipped a
   non-0.x release.

## Acceptance criteria

- [x] `package.json` name is `@neongate-ai/sinapsi` and exports point at `sinapsi.js`.
- [x] `<sinap-si>` is the only runtime UI tag; React types augment that tag.
- [x] README, installer snippet, and audits document Sinapsi names.
- [x] `./cli/graph check` passes.
- [x] Historical Graphz identifiers do not remain in source, CLI, or current rules.

## Evidence

`package.json`, `src/sinapsi.config.json`, `src/index.ts`, `src/react.types.ts`,
`cli/src/commands/setup-project.sh`, `.audits/*.audit.sh`, `./cli/graph check`.

## Related records

- ADRs: 0014
- Rules: 001, 002, 011

## Compatibility and risks

This is a breaking public-API rename. Consumers of the unpublished Graphz 0.x
identity must switch package, tag, and `defineSinapsi()`. SSR, accessibility, and
payload boundaries are unchanged.
