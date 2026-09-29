---
description: Defines the immutable package, publishing, framework-agnostic, SSR-safe, and public compatibility boundaries for Sinapsi.
alwaysApply: true
---
# Rule 001: Package contract

- Effective: 2026-08-21
- Priority: Critical
- Applies: Always

1. `sinapsi` is a library, not an application or monorepo.
2. Keep the package framework-agnostic and SSR-safe.
3. Keep `<sinaps-i>` as the only runtime UI implementation.
4. `sinapsi/browser` owns registration side effects.
5. `react-types` is type-only and must not add a React runtime dependency.
6. Intentional npm payload is limited to `dist/`, the shell-only `cli/`, and npm root metadata.
7. Do not publish source maps.
8. Treat every public export, attribute, property, and entry point as a compatibility commitment.
9. Documentation sites and framework examples live outside this repository.
10. npm identity and GitHub ownership are independent: publish `sinapsi` from `jonatassales/sinapsi`.
11. Runtime dependencies are limited to pinned `motion` and `zod`. The standalone bundle inlines both.
