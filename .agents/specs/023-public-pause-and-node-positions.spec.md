# SPEC-023: Public pause and painted node positions

- Status: Implemented
- Created: 2026-10-05
- Mode: Prospective
- Owner: Sinapsi maintainers

## Problem

Consumers need to hold the real graph still while placing their own cards above exact painted semantic nodes. Version 0.3.0 offers activation IDs but neither explicit pause nor public projected positions; private shadow access and simulated interaction are outside the package contract.

## Scope and requirements

Prepare additive 0.4.0. Add Boolean HTML `paused` and typed `paused` property. Presence pauses; false/null/undefined removes the attribute. Pause stops all motion, reveal work and recurring paint without changing move, speed, activation, focus or selection. Unpause resumes at most one loop and continues respecting pointer, keyboard and reduced-motion freezing. Invalid property input retains the previous state with a diagnostic.

Expose `getNodePositions(): readonly SinapsiNodePosition[]`, containing semantic IDs and the exact last painted x/y coordinates in CSS pixels in the viewport, after axis-aligned CSS translate/scale and independently of DPR. No decorative IDs, private scene fields or DPR backing-store coordinates. Results are fresh snapshots, empty before paint or while disconnected, and reconcile graph replacement, resize and reconnect. Readback does not emit pointer events, move focus or repaint. No consumer-specific cards or three-node cap enter the package.

## Acceptance

- [x] Public pause attribute/property reflection, invalid-input retention and initial upgrade.
- [x] Stable paused coordinates and no recurring paint; explicit activation updates still repaint.
- [x] Public positions match the actually painted semantic frame, with defensive snapshots and replacement/disconnect/reconnect cleanup.
- [x] Existing interaction, reduced motion and SSR compatibility remain green.
- [x] Complete Graph check and real-browser public-surface evidence.

## Related records

ADR-0019; extends SPEC-022 without changing programmatic activation semantics. Rules 001–012.

## Release boundary

The owner explicitly authorized this source PR and its branch push. No tag, merge, package publication or Neongate local-archive consumption. The owner controls publication. Downstream acceptance waits for the published API.


Evidence: [023-public-pause-and-node-positions.evidence.md](023-public-pause-and-node-positions.evidence.md).
