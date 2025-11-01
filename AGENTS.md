# AGENTS.md

Purpose
-------

This file documents conventions, rules, and expectations for automated agents (and human reviewers) working on the mtng-unstorage repository. Treat this as the single source of truth for agent behavior, temporary files, release procedures, and code-quality expectations.

Core principles
---------------

- Non-destructive: avoid making breaking or otherwise risky changes without an associated PR and CI verification.
- Small, verifiable steps: prefer small commits that are easy to review and validate with the project's prepublish pipeline.
- Follow the repo tooling: use `pnpm`, `vitest`, `vite`, `eslint`, and the `gh` CLI as documented below.
- Document changes: every change that affects API/contract (including exported types and helper names) must have a `CHANGELOG.md` entry.

Repository conventions (short)
-----------------------------

- Keep `aws-s3` and `aws-s3-flex` as separate drivers for now. Do not attempt to refactor them into a shared factory unless authorized.
- Central helpers:
  - Cross-driver utilities live in `src/utils.ts`.
  - S3-specific helpers live in `src/drivers/aws-s3/shared.ts`.
  - Types for S3 drivers live in `src/drivers/aws-s3/types.ts`.
- Naming conventions:
  - Prefer explicit S3 helper names: `toS3StorageKey`, `normalizeS3Key`, `joinS3Key`.
  - Type names use UpperCamelCase: `AwsS3DriverOptions`.
- Exports:
  - Drivers and helpers should be re-exported from `src/index.ts` where appropriate. If adding subpath exports, update `package.json` `exports` accordingly.

Testing & CI
------------

- Local prepublish pipeline (required before pushing release or merge PR):

```bash
pnpm run typecheck    # tsc --noEmit
pnpm run lint         # eslint src --ext .ts,.js
pnpm run build        # vite build
pnpm run test         # vitest run
```

- E2E tests are located in `tests-e2e/` and are skipped unless environment variables are set (see tests for details). Use `AWS_S3_E2E_ENABLED=true` and a test bucket or LocalStack when running.
- Keep unit tests fast and isolated: mock external services (like AWS S3) in unit tests.

Temporary files and release notes
--------------------------------

- Temporary release note files such as `RELEASE_BODY_0.2.0.md` may be generated in the repo root to facilitate `gh release create/edit`. Remove these temporary files after use. Agents must not commit temporary release body files unless explicitly requested.
- If you want permanent release notes in the repo, add them under `docs/release-notes/` and update the todo list and PR description.

Releases and tagging
--------------------

- Version bumps should follow semantic versioning. Because this repository may contain breaking changes when renaming helpers/types, be conservative: bump the major version for breaking changes, minor for new features, patch for fixes. However, while the major version is 0, keep major version at 0. 
- Release workflow (recommended):
  1. Bump `package.json` version and update `CHANGELOG.md` (move Unreleased -> `## [x.y.z] - YYYY-MM-DD`).
  2. Commit and push the changes to the release branch.
  3. Merge to `main` via PR when CI passes.
  4. Create an annotated tag on `main` and push it: `git tag -a vX.Y.Z -m "Release vX.Y.Z" && git push origin vX.Y.Z`.
  5. The GitHub Actions release workflow will publish / create release notes; if necessary, use the `gh` CLI to update the release body from `CHANGELOG.md`.

Sample `gh` usage for temporary release body file:

```bash
# create temporary file from CHANGELOG (manually or via script)
gh release create v0.2.0 --notes-file RELEASE_BODY_0.2.0.md -R mtngtools/mtng-unstorage
# then remove the temp file
rm RELEASE_BODY_0.2.0.md
```

Change and breaking-change policy
---------------------------------

- Any removal/rename of public exports, helper functions, or exported type names must be documented under `CHANGELOG.md` in an explicit `### Breaking` section.
- If you must perform a breaking change, prefer preparing a migration guide (`MIGRATION.md`) and include an automated codemod (jscodeshift) or simple `sed` examples in the PR description.

PR & commit guidelines for agents
---------------------------------

- Create a concise branch name describing the work (e.g., `feat/aws-s3-flex-phase1`).
- Commit messages should follow the conventional format: `type(scope): short description` (e.g., `feat(aws-s3): add aws-s3-flex driver`).
- Include in the PR description:
  - Summary of changes
  - Files touched
  - Tests run locally (pass/fail)
  - Any manual verification steps
  - Migration notes if applicable

Files of interest (quick map)
----------------------------

- `src/drivers/aws-s3/aws-s3.ts` — main S3 driver (implementation)
- `src/drivers/aws-s3/aws-s3-flex.ts` — flex driver (phase1 parity)
- `src/drivers/aws-s3/shared.ts` — S3-only helpers (normalize/join/toS3StorageKey, validateS3Options)
- `src/drivers/aws-s3/types.ts` — S3 driver types
- `src/utils.ts` — cross-driver utilities (serialize/deserialize/streamToString/etc.)
- `CHANGELOG.md` — canonical release notes
- `package.json` — exports and version; update `exports` when adding subpath public entry points

Agent tooling etiquette
----------------------

- Use the workspace tools (pnpm, vitest, eslint) for verification. Do not call external network services unless the user authorizes it (for E2E you may require AWS credentials or LocalStack details).
- Do not leave temporary or generated files in the repo. If you create temporary files for GitHub releases or test output, remove them before finishing.
- When editing files, prefer minimal, focused edits. Preserve style and existing public APIs unless intentionally changing them with a documented breaking change.

If you are unsure
---------------

- Ask the user for clarification when a task is ambiguous or would touch public API.
- If a change requires repository-wide refactor or affects downstream consumers, propose a plan as a PR and request review rather than pushing directly to `main`.


----

This file is intended to be short and actionable. Feel free to expand or request additions (e.g., add a sample codemod, CI monitoring steps, or release checklist automation).
