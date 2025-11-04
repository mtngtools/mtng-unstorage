# AGENTS_TYPESCRIPT.md

TypeScript tooling & stacks (agent guidance)
-------------------------------------------

This document contains TypeScript-specific tooling choices and minimal verification steps agents should run when working on TypeScript projects in the mtngtools organization.

What to check (quick)
---------------------

- Run local verification: `pnpm run typecheck && pnpm run lint && pnpm run build && pnpm run test`.
- For E2E: ensure environment gating variable is set (e.g., `AWS_S3_E2E_ENABLED=true`) and documented in the PR.
- When using `gh api` or `gh release`, include a PR or human-authored description and remove temporary files after use.
- Avoid direct pushes to protected branches; open a PR and request the appropriate reviewers (use `CODEOWNERS` where helpful).

Tooling sections
----------------

Vite

- Rationale: fast dev server and build tooling for modern TS projects, good DX and d.ts generation with plugins.
- Typical files: `vite.config.ts`, `tsconfig.json`, `package.json` scripts (build/preview/dev).
- Agent checks: `pnpm run build` (should succeed), ensure `vite-plugin-dts` is configured if the project exports types.
- Notes: ensure build outputs land in `dist/` and that d.ts files are generated when needed for packages.

Vitest

- Rationale: lightweight, fast unit test runner that integrates well with Vite.
- Typical files: `vitest.config.ts`, `vitest.setup.ts`.
- Agent checks: `pnpm run test` or `pnpm run test:ci` for headless runs. Prefer unit tests mock external services; E2E tests should be gated by environment variables.

ESLint

- Rationale: enforce style and catch common bugs early.
- Typical files: `.eslintrc.js` or `.eslintrc.cjs`; share rules via an org preset when possible.
- Agent checks: `pnpm run lint` and fail PRs on lint errors (or require autofix before merge).

TypeScript (tsc)

- Rationale: static typing and API guarantees.
- Typical files: `tsconfig.json`, `tsconfig.build.json` (if needed).
- Agent checks: `pnpm run typecheck` (`tsc --noEmit`) as part of CI/prepublish.

Nuxt / Nitro / Vue / Unjs (frameworks)

- Rationale: for web apps or full-stack projects using Vue/Nuxt/Nitro. When a repo uses these frameworks, include framework-specific agent checks (build + server-side rendering tests).
- Typical files: `nuxt.config.ts`, `nitro.config.ts`, Vue single-file components, and `package.json` scripts.
- Agent checks: `pnpm run build` (Nuxt/Nitro build), verify SSR entry points if publishing server bundles.
- Notes: E2E tests for frameworks should run in separate CI job and be optional for PRs (unless small and fast).

Monorepo specifics (TypeScript)

- Use `pnpm` workspaces for multi-package repos. Keep `pnpm-workspace.yaml` at the root and list packages explicitly (for example `packages/*`).
- Prefer multiple small packages with clear responsibilities over a single huge package.
- Use CI that runs per-package tests in parallel and a top-level integration job for cross-package E2E.
- Versioning strategies: independent (per-package) with `changesets` or fixed single-version for tightly-coupled packages.

Notes
-----

This file is focused on TypeScript tool choices and verification steps. For organization-wide policies about network usage, secrets, and agent behavior that apply regardless of language, see `AGENTS_ORGANIZATION.md`.
