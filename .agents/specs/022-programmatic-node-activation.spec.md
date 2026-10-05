# SPEC-022: Programmatic node activation

- Status: In progress
- Created: 2026-10-05
- Mode: Prospective
- Owner: Sinapsi maintainers

## Contract

Prepare additive 0.3.0. The owner separately authorized completing the 0.3.0 release on 2026-10-05 after the local prerequisite checks passed; publication follows the release workflow. Public `activeNodeIds` is a typed readonly string array, reflected as JSON `active-node-ids`. Validate and deduplicate nonempty IDs; unknown IDs are pruned against the current semantic document. Invalid input logs a diagnostic and retains the previous valid set. Removing the attribute or setting null clears it. Graph replacement prunes removed IDs. Getter snapshots cannot mutate internal state.

Highlight exactly programmatic nodes and their incident edges, independently of existing hover/click selection. No synthesized events, native cards, labels, focus movement or graph freeze. No portfolio-specific three-node limit. Existing interaction semantics remain available alongside programmatic highlighting. Decorative generated graphs remain muted.

Frozen and reduced-motion graphs stop recurring frame subscriptions and reveal tweens, paint on relevant updates, and resume at most one loop. Disconnection cleans up; reconnect preserves public state and renders fully revealed. Public imports remain SSR safe and framework agnostic.

## Acceptance

Public property/attribute compatibility tests, renderer/scene motion tests, frozen-loop tests, existing interaction suite and full Graph checks. No Neongate consumption before separate publication.

## Related records

ADR-0018; extends SPEC-021 without restoring the removed numeric activation API.

## Local verification — 2026-10-05

The existing tests audit first reproduced two noncanonical presentation suite names and four CI sensor commands bypassing Graph. Renaming those suites to their required core/service concerns and restoring the four explicit Graph CI commands resolved that gate without changing runtime behavior.

`./cli/graph check` passed: 116 tests across 25 suites, source/test typecheck, lint, module/standalone builds, version validation and every repository audit. Log: `/tmp/sinapsi-gate-check.log`. `npm pack --dry-run --ignore-scripts --json` then verified the already-validated package payload: 42 allowed files, 111195 bytes packed and 385918 bytes unpacked, with no source maps, tests, hooks or harness files. Payload evidence: `/tmp/sinapsi-package-payload.json`. No package was created or published by that dry run. Publication and downstream pinning remain separate operations.
