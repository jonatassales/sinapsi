# Architecture decision records

ADRs preserve durable Sinapsi decisions. Records `0001` through `0006` were
reconstructed retrospectively on **2026-08-21** from the package's intended
contracts. Records `0007` onward document current decisions from their stated
creation date. ADR-0010 establishes Graph as the single repository command
surface; ADR-0011 adds the explicit public npx installer exception; ADR-0012 adds
agent-native workflows, runtime guardrails, and harness maturity enforcement;
ADR-0014 records the Sinapsi product identity; ADR-0015 colocates the Vite
sandbox and Husky adapters with Graph; ADR-0016 adds interactive semantic nodes; ADR-0017 makes neighborhood
lighting event-driven and drops public `activation`.

Use [`template.md`](./template.md) for new decisions. Never rewrite an accepted
ADR to hide a changed decision; record the update and supersede it explicitly.

- [0018-programmatic-node-activation.adr.md](0018-programmatic-node-activation.adr.md) — explicit programmatic node highlights and frozen rendering.
