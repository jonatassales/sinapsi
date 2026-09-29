# Release context

Intentional package payload consists of `dist/`, the Graph binary `cli/graph`,
`cli/readme.md`, `cli/src/`, and npm's automatic root metadata files. Source maps
are disabled. Tests, Git hooks (`cli/.husky/`), `.agents/`, and `.audits/` must
not enter the package. The CLI is included only to provide the `graph` package
binary and explicit npx project setup.

Commit messages follow Conventional Commits. `package.json#version` must be
canonical SemVer. A staged version change must move forward relative to `HEAD`.
Stable 1.x releases publish from `jonatassales/sinapsi` on main; 0.x versions skip
npm publish.

A release-oriented source change runs `graph check`; CI also lints commit history
through the checked-in Graph entry point and runs `npm pack --dry-run`. The
`prepack` lifecycle delegates to the same Graph gate.

Consumer project setup remains explicit through
`npx -y --package=sinapsi@latest graph`. Agent runtime guardrails deny
autonomous package publication and require human approval for tag, push,
merge/rebase, and PR-merge boundaries.
