# ADR-0019: Explicit pause and painted-position snapshots

- Status: Accepted
- Created: 2026-10-05
- Mode: Prospective

## Decision

Add an explicit Boolean pause input composed with existing freeze reasons. Expose copied semantic x/y snapshots from the same final frame sent to the renderer and native presentation service. Readback maps the exact painted centers through the canvas DOM rectangle into viewport CSS pixels, including axis-aligned scale and translation. Callers subtract their overlay rectangle to position custom content. CSS rotation/skew is outside this coordinate contract.

This keeps consumer layout outside Sinapsi, preserves the closed shadow boundary and avoids reconstructing a second graph, querying private canvases or synthesizing hover to pause. Pause and geometry readback are independent of programmatic activation, so existing 0.3.0 consumers retain moving highlights unless they explicitly request pause.

## Compatibility and release

Additive 0.4.0 with no new runtime dependency or framework wrapper. Publication remains owner-controlled; consumers must install the published version before using the new API.
