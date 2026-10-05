# SPEC-023 evidence — pause and painted coordinates

Date: 2026-10-05. Base: `ed90ce2` (main, merged programmatic activation). Target: additive `sinapsi@0.4.0`. Owner requested a source PR and will publish manually.

## Checks

- Node 24.21.0, pnpm 12.4.2.
- `./cli/graph doctor`: PASS, including configured Git hooks.
- `./cli/graph check`: PASS; lint, source/test types, 122 tests across 25 suites, builds, SemVer and every versioned audit. Existing Biome deprecated-configuration informational message remains.
- `npm pack --dry-run`: PASS; 42 allowed files, about 113 kB packed. No source maps, tests, hooks or harness files in the payload. No publication performed.
- Colocated public-element tests reproduce missing pause reflection and missing position method before implementation, then pass reflection/invalid input, copied painted-frame coordinates, axis-aligned scale, replacement, disconnect/reconnect, preconnection pause, stopped frame subscriptions, activation repaint without movement/events/focus and one-loop resume. Existing SSR and pointer/keyboard/presentation suites remain green.

## Chrome acceptance

Built standalone ESM entry point served with a local static server, tested in installed Google Chrome through Playwright. Four combinations: DPR 1/2 × normal/reduced motion, each with twelve semantic nodes and three external consumer-owned cards.

All PASS: paused geometry and paint count stable for 300 ms; all position snapshots match the actual Canvas 2D arc centers with translated/scaled host, border and padding; three active IDs produce independent overlays above their public coordinates; activation retains geometry, focus and zero pointer events; no recurring paints during the active pause; normal motion resumes, while reduced motion stays frozen; resize refreshes coordinates; disconnect empties the snapshot; reconnect restores twelve positions; zero page errors. Two additional initial HTML upgrade checks passed with paused/nodes attributes in both orders, retaining static geometry. Screenshot inspection confirmed the consumer cards sit above three different node positions.

Reproduce after `./cli/graph build`: serve the repository (`python3 -m http.server 3204`), import `/dist/standalone/sinapsi.js` as a module, create a sized `<sinaps-i paused>` with semantic `nodes`, then read `getNodePositions()` before/after waits and writes to `activeNodeIds`. Compare public centers to instrumented standard Canvas 2D `arc` calls before module registration, mapping through the rendered canvas rectangle. Repeat at DPR 1 and 2, reduced motion, host `transform: scale(.8)`, resize and reconnect. Keep any instrumentation outside production code and never access the closed shadow tree.

## Review

Standards: PASS. Additive typed API, canonical observed-attribute registry, SSR-safe exports, one runtime implementation, composed freeze reasons, lifecycle cleanup, no consumer layout logic or new runtime dependency.

Spec fidelity: PASS. Public Boolean pause and copied last-painted semantic viewport coordinates meet SPEC-023. No rotation/skew promise. Activation alone retains 0.3.0 movement semantics. Readback has no rendering or interaction side effects. Publication and downstream installation remain owner-controlled.

## Remaining gate

Merge/release are manual. Neongate remains on published 0.3.0 until the owner publishes 0.4.0. This source verification does not claim anchored, paused cards are already running in Neongate.
