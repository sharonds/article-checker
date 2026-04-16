# Handoff

## State

Article Checker app is at v1.0 with 9 skills, dashboard, MCP server, 180 passing tests. PR #8 (quick wins) was merged earlier this session cycle. No active work in progress on this repo right now.

Landing page is in a separate repo `~/article-checker-landing` and is fully built (41 commits).

## Next

**Rename `article-checker` → `checkit`** across this entire repo. Full plan is at:
`~/article-checker-landing/docs/superpowers/plans/2026-04-17-checkit-rebrand.md` — specifically **Phase A (Tasks 1–2)** covers this repo.

That includes:
- package.json name + bin
- All `src/**/*.ts(x)` references
- Dashboard branding
- MCP server name
- HTML report header
- Config dir migration `~/.article-checker/` → `~/.checkit/`
- CLI binary output filenames
- GitHub repo rename `sharonds/article-checker` → `sharonds/checkit`
- 180 tests must still pass after rename

Domain: `articlechecker.dev` → `checkit.cc` (in docs only; the CLI tool itself doesn't use a domain).

## Context

- Scope audit: 44 real files to touch (21 source, 23 docs). Ignores stale `.worktrees/` and `.playwright-mcp/` dirs.
- Nothing is public yet, so breaking changes are fine — no npm back-compat needed.
- Run the full test suite + build after the rename. Both must pass.
- The landing page repo will rename in parallel (Phase B of the same plan).

## Session strategy

This conversation has used ~650k tokens. Start a fresh session before executing. Read the plan + AGENTS.md + this note = full context in <20k tokens.
