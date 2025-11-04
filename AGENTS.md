# AGENTS.md

Package-specific agent guidance — mtng-unstorage
----------------------------------------------

This file contains only repository/package-specific guidance for automated agents working on the `mtng-unstorage` package. For organization-wide conventions, tooling policies, and network usage rules, see `AGENTS_ORGANIZATION.md`.

Repository-specific notes
-------------------------

- `AGENTS_REPO.md` documents repository-level agent guidance.

Technology-stack-specific notes
-------------------------------

This is Typescript package, consult `AGENTS_TYPESCRIPT.md`.

Package-specific notes
----------------------

- E2E tests are in `tests-e2e/` and are gated by an environment variable. Do NOT run or publish E2E results unless `AWS_S3_E2E_ENABLED=true` and credentials are provided.
- Drivers and S3 helpers live under `src/drivers/aws-s3/`. Exercise caution when changing exported helper names — update `CHANGELOG.md` and include migration notes in the PR when making breaking changes.
- Cross-driver utilities are in `src/utils.ts` and are used by drivers in this package.

Files of interest (package)
---------------------------

- `src/drivers/aws-s3/` — S3 driver implementations and helpers
- `src/utils.ts` — shared helpers
- `tests-e2e/` — integration/E2E tests (gated)
- `CHANGELOG.md` — canonical release notes for this package
- `package.json` — package metadata, exports, and version


----

Keep this file short and focused — add only repo/package-specific rules here.
