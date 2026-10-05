# ADR-0018: Programmatic highlighting separate from interaction

- Status: Accepted
- Created: 2026-10-05
- Mode: Prospective

## Decision

Add explicit semantic node IDs as a separate programmatic paint input. Keep hover neighborhoods, focus, click selection, labels and native presentations unchanged. Consumers control scheduling and limits; the package controls validation, topology reconciliation and painting. This extends ADR-0017, without reviving numeric activation or event simulation.

Frozen rendering becomes invalidation driven so reduced motion saves work as well as keeping geometry still. A change to activation can repaint a frozen graph without restarting motion.

## Release

Prepare version 0.3.0 locally. Publication is a separate owner-authorized operation.
