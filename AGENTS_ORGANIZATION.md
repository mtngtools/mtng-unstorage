# AGENTS_ORGANIZATION.md


Purpose
-------

This document is the organization-level agent guidance for the mtngtools GitHub organization. It captures the long-term conventions, technology stacks we support, and recommended repository structures. For now, this file lives in this repository as a canonical draft. It will eventually reference or be replaced by a central document in the mtngtools organization-level docs repo (for example: `https://github.com/mtngtools/docs`), and contain links to per-language and per-framework guidance maintained centrally.

Note: this file intentionally contains broader recommendations and references.


Multiple levels of guidance
---------------------------

Multiple levels of guidance exist to help agents navigate the various aspects of their work.

- Organization-level guidance (this file)
- Repo-level guidance (`AGENTS_REPO.md`)
- Package-level guidance (`AGENTS.md`)
- Tech stack-specific guidance (for example `AGENTS_TYPESCRIPT.md`)

Every repository or package should reference each of these four levels.

Table of contents
-----------------

- Purpose
- Multiple levels of guidance
- Audience & quick start
- Language-specific guides
- Agent behavior — organization rules
- Tool calling & network-usage policies
- Maintenance and ownership

Audience & quick start
---------------------

- Audience: automated agents, maintainers, and contributors who work across repositories in the mtngtools organization.
- Quick start (2 steps):
  1. Run local verification (typecheck → lint → build → unit tests) and open a PR for changes.
  2. Consult the language-specific agent guide for tool-specific commands (for TypeScript see `AGENTS_TYPESCRIPT.md`).

Agent behavior—organization rules
--------------------------------

- Agents must be conservative: prefer making small commits and open PRs rather than direct pushes to default branches.
- Agents should run the minimal verification steps before pushing changes: typecheck → lint → build → unit tests.
- Any release or tag creation should be coordinated and follow the organization's release checklist; prefer creating PRs that include release notes rather than creating tags directly from agents.
- Do not start work on features or bug fixes if:
  - you are on the `main` branch or another protected branch
  - there is no GitHub issue or task tracking the work

Tool calling & network-usage policies (organization)
--------------------------------------------------

These rules govern how automated agents should call tools, access network services, and interact with external systems. They are written to be intentionally conservative — security and auditability are primary concerns.

- Prefer local verification before network calls: agents should run the local prepublish pipeline (typecheck → lint → build → test) and only call remote services when necessary.
- Do not call external network services unless explicitly authorized by a human or by repository configuration (for example CI jobs that run with appropriate credentials). Examples of authorized scenarios include:
  - CI jobs that run with organization-managed credentials (e.g., GitHub Actions runners with secrets configured).
  - E2E jobs gated by environment variables (for example `AWS_S3_E2E_ENABLED=true`) where the environment provides credentials.
- Never exfiltrate secrets. Agents must not print or commit sensitive values (API keys, AWS credentials, private tokens). When a tool requires a token, use environment variables or secure secret stores provided by CI.
- Use the `gh` CLI or provider APIs only when necessary and with explicit intent. When updating releases or creating tags programmatically, prefer creating a PR that documents the intent and includes the release notes; a maintainer can then merge the PR to trigger release automation.
- Temporary files created to interact with remote services (for example temporary `RELEASE_BODY_*.md` used with `gh release create`) must be deleted before finishing the run and must not be committed to the repository.
- Agents must be conservative with writes: prefer opening a PR with minimal diffs rather than pushing directly to protected branches. Server-side protections (branch rules) are the authoritative enforcement mechanism.
- When an agent needs to perform destructive or privileged operations (publish to npm, create GitHub releases, modify branch protection rules), require an explicit approval step recorded in a PR or an issue comment from a maintainer.
- Logging and audit: agents should emit concise logs describing the actions they intend to perform (why/what/outcome) and any external calls; these logs should avoid leaking secrets and be stored where maintainers can inspect them (for example CI logs or a secured artifact store).


----

This file is a living draft. When organization-level docs repo is available, convert this file to an index that references the central source-of-truth.
