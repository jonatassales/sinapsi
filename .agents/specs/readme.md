# Specifications

SPECs describe bounded changes and their acceptance evidence. Records `001`
through `007` are retrospective reconstructions dated **2026-08-21** because the
package intent predated the recovered harness. Records `008` onward describe
current work and use their actual creation date. SPEC-012 consolidates repository
commands in Graph, SPEC-014 adds the explicit npx project-setup flow,
SPEC-015 strengthens skill/rule discoverability, workflows, runtime guardrails,
and harness-score CI enforcement, SPEC-017 renames the product to Sinapsi,
SPEC-018 makes `pulse` compact and expand the whole graph, SPEC-019 moves
the Vite app to `sandbox/` and Husky adapters to `cli/.husky/`, SPEC-020
replaces public `nodes` with a semantic JSON document and Obsidian selection,
and SPEC-021 switches that document to `{ graph }` with event-driven lighting.

Statuses are `Proposed`, `In progress`, `Implemented`, `Superseded`, and
`Rejected`. Use [`template.md`](./template.md), follow
[`workflow.md`](./workflow.md), and link applicable ADRs and rules.

- [022-programmatic-node-activation.spec.md](022-programmatic-node-activation.spec.md) — explicit programmatic node highlights and frozen rendering.

- [023-public-pause-and-node-positions.spec.md](023-public-pause-and-node-positions.spec.md) — explicit pause and public painted semantic geometry.

- [SPEC-023 evidence](023-public-pause-and-node-positions.evidence.md) — pause, painted positions, browser and package gates.
