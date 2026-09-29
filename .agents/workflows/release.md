# Release workflow

Use when preparing a patch, minor, or major Sinapsi release. Publishing remains a human-controlled action.

1. Read `.agents/context/release.md`, Rule 009, Rule 011, and the release SPEC.
2. Confirm the working branch is intended for release and the working tree is clean.
3. Confirm `package.json#version` is the intended canonical SemVer.
4. Run `graph doctor`.
5. Run `graph lint`.
6. Run `graph typecheck`.
7. Run `graph test` and require zero unhandled errors.
8. Run `graph check`.
9. Run `npm pack --dry-run` and inspect the payload.
10. Confirm local `main` equals `origin/main` before tagging a merged release.
11. Confirm the target npm version is not already published.
12. Stop for human approval before `git tag`, `git push`, or any publish command.
13. After a human publishes, verify the registry version and `npx` binary.

The runtime shell guard denies autonomous package publication and asks for approval on release-boundary Git operations.

`.github/workflows/release.yml` publishes only from `jonatassales/sinapsi` on main and
skips 0.x versions.
