# Production Integration Plan — Post Plan-3 Provider Migration

> **Scope:** Translate the Plan-3 decision matrix into concrete code changes, feature
> flags, environment variable updates, and rollout phases. This is an **implementation
> plan**, not a research plan — everything below is about production code paths.

**Prerequisite:** Gate 4 passed (external reviewer sign-off on `poc-replacement/DECISION-MATRIX.md`).

**Dependencies:** Plan 2 (fact-check feature-flag infrastructure) in progress; this plan
extends that pattern to other skills rather than inventing new infrastructure.

---

## Guiding principles

1. **Every migration is behind a new feature flag, default off.**
   - Flag off = current production behaviour (safe rollback = one config change)
   - Flag on for internal team → opt-in beta → default after 30 days of ≤ 5% error rate
2. **No deletion of legacy providers until 30 days post-default-on** — instant rollback
   path preserved.
3. **Per-skill provider config**, not a global LLM switch. Matches where the codebase
   is heading (`src/providers/registry.ts`).
4. **Cost telemetry before behaviour changes.** Every new code path emits a structured
   cost event before the quality win is reviewed.
5. **No user-facing marketing claims until production validation** on ≥ 100 real
   articles per skill.

---

## Phased rollout

### Phase 0 — Pre-work (1-2 days)

**Goal:** Infrastructure ready to support per-skill provider config and telemetry.

Changes:
- [ ] Add `OPENAI_API_KEY` to `src/config.ts` interface + `.env.example`
- [ ] Add `GEMINI_API_KEY` to `src/config.ts` (already used in fact-check via Plan 2)
- [ ] Extend `src/providers/registry.ts` with a `per-skill provider matrix`
      structure — each skill can declare `{ primary, fallback, premium?, secondary? }`
- [ ] Add `src/providers/openai.ts` client (already have MiniMax, Gemini, Exa clients)
- [ ] Add `src/providers/openalex.ts` client (drop-in for Semantic Scholar)
- [ ] Telemetry: every provider call emits `{ skill, provider, model, promptTokens,
      completionTokens, latencyMs, costUsd, errorCode? }`
- [ ] Dashboard / CLI flag surface: `checkapp config providers --show` and
      `checkapp config providers --set skill=...,provider=...`

No behaviour changes in Phase 0. Release as a minor version bump.

---

### Phase 1 — Forced swaps (1-3 days)

**Goal:** Fix things that are already broken in production.

#### Phase 1.1 — Semantic Scholar → OpenAlex (drop-in)

SS's free tier is production-unusable (HTTP 429 from shared IPs). OpenAlex is free,
has same API shape, 200M+ works indexed, and passes the polite pool with a `mailto`
parameter.

Changes:
- [ ] Create `src/providers/openalex.ts` mirroring `semanticscholar.ts` interface
- [ ] Update `src/skills/academic.ts` to prefer OpenAlex over SS when `OPENALEX_MAILTO`
      env var is set
- [ ] Keep Semantic Scholar code as fallback — active when `SEMANTIC_SCHOLAR_API_KEY`
      is present (paid tier)
- [ ] Update test fixtures (`src/skills/academic.test.ts`) for OpenAlex response shape
- [ ] Docs: README section on citations provider choice

Rollout:
- Internal team: 1 week
- Default on: after internal validation (no flag needed — SS was already broken, this
  fixes a bug)

Rollback: `unset OPENALEX_MAILTO` reverts to SS code (which then 429s, same as current
broken state — no harm done).

**Expected impact:** Fixes 100% of broken citation calls for free-tier users.

---

### Phase 2 — High-impact LLM skill replacements (1-2 weeks)

**Goal:** Migrate text-classification skills to GPT-5.4 where it wins decisively.

#### Phase 2.1 — Per-skill provider configuration

Introduce `LLM_PROVIDER_MATRIX` environment variable OR config file:

```json
{
  "skills": {
    "tone":    { "primary": "openai:gpt-5.4",     "fallback": "minimax:M2.7" },
    "summary": { "primary": "openai:gpt-5.4",     "fallback": "minimax:M2.7" },
    "brief":   { "primary": "openai:gpt-5.4",     "fallback": "minimax:M2.7" },
    "purpose": { "primary": "openai:gpt-5.4",     "fallback": "minimax:M2.7" },
    "legal":   {
      "primary_with_policy":   "minimax:M2.7",
      "primary_no_policy":     "openai:gpt-5.4",
      "premium_no_policy":     "gemini:deep-research",
      "fallback":              "minimax:M2.7"
    }
  }
}
```

Changes:
- [ ] Extend `src/providers/resolve.ts` to accept the matrix config and resolve
      per-skill provider based on both skill ID and runtime context (e.g. whether a
      policy doc was supplied for legal)
- [ ] Update each of `src/skills/{tone,summary,brief,purpose,legal}.ts` to call the
      resolver rather than `getLlmClient()`
- [ ] Feature flag: `CHECKAPP_USE_PROVIDER_MATRIX=1` enables the new resolver; off
      means current MiniMax-for-everything behaviour

#### Phase 2.2 — GPT-5.4 skill migration

Order of rollout (lowest risk first):

1. **brief** — GPT-5.4 wins 4.83 vs MiniMax 4.33. Structured document-compliance check.
2. **purpose** — GPT-5.4 4.17 vs MiniMax 3.75. Classification task.
3. **summary** — GPT-5.4 4.33 vs MiniMax 4.22. Small gap but consistent.
4. **tone** — GPT-5.4 4.17 vs MiniMax 2.94. Largest gap — highest-impact migration.
5. **legal (no policy)** — GPT-5.4 3.11 vs MiniMax 1.78. Only usable provider. Requires
   new UI surface ("Run legal risk check without policy doc").

Each skill:
- [ ] Week 1 internal team usage; compare outputs on ≥ 20 articles
- [ ] Week 2 beta opt-in for ≤ 10% of paid users
- [ ] Week 3-4 monitor error rate, cost, user-reported issues
- [ ] If ≤ 5% error rate and ≥ 90% favourable feedback → default on
- [ ] Keep MiniMax code path for 30 days post-default-on before removal

**Legal with-policy** stays on MiniMax (3.44 vs GPT-5.4 2.89). No migration needed.

**Expected cost impact:** Team of 100 articles/month × 5 skills → current $0.50/mo →
new ~$10/mo. Price accordingly in the paid tier.

---

### Phase 3 — Hybrid augmentations (2-3 weeks)

**Goal:** Implement the two augment verdicts where a secondary signal improves quality
at modest cost.

#### Phase 3.1 — Plagiarism: Copyscape + Gemini secondary

Changes:
- [ ] New flag: `--plagiarism-hybrid` (cli) / `plagiarism.hybrid: true` (config)
- [ ] Trigger rule in `src/skills/plagiarism.ts`: when Copyscape returns
      `10% ≤ similarityPct ≤ 30%` OR `matches[0].url` is a non-Wikipedia domain,
      additionally fire Gemini grounded check
- [ ] Extend `PlagiarismResult` type with `secondarySignal?: { engine, similarityPct,
      copiedSentences, source }`
- [ ] Dashboard: surface secondary findings as a collapsed subsection
- [ ] CLI output: indicate when secondary fired ("primary uncertain — consulted
      secondary")

Fixes the "Copyscape misses near-verbatim from non-Wikipedia sources" case from POC 1.

Rollout: standard flag → internal → beta → default after 30 days validation.

#### Phase 3.2 — AI Detection: Copyscape + GPT-5.4 secondary (NOT Gemini)

Changes:
- [ ] New flag: `--ai-detection-hybrid` / `aiDetection.hybrid: true`
- [ ] Always fire GPT-5.4 secondary when flag is on (cheap, $0.0025/call)
- [ ] 4-state verdict in `AiDetectorResult`:
      `verdict: "both_ai" | "primary_ai_only" | "secondary_ai_only" | "both_human"`
- [ ] UI copy per state (see DECISION-MATRIX.md Follow-on B)
- [ ] Update `src/skills/aidetection.ts` to merge signals

Use gpt-5.4 (NOT Gemini) as the secondary — per POC 2 supplement, GPT-5.4 is strictly
better at catching AI-edited content.

Rollout: standard flag pattern.

---

### Phase 4 — Premium tiers (parallel with Phase 2-3)

**Goal:** Product-differentiated premium features that justify a paid tier.

#### Phase 4.1 — Citations: Gemini grounded "Deep Citation Search"

Canonical-source recall is 7× better with Gemini (70% vs 10%). But 60s latency
requires async.

Changes:
- [ ] New premium skill: `--deep-citations` flag on article audit
- [ ] Queues a Gemini grounded job; status: `pending | in_progress | completed | failed`
      (reuse deep-audit state machine from Plan 2 Gate 3)
- [ ] UI: "Find canonical source" button on each claim shown with OpenAlex results
- [ ] Email / push notification on completion
- [ ] Per-job cost telemetry → alert if monthly Gemini cost > budget

#### Phase 4.2 — ~~Legal: Deep Research premium~~ CANCELLED

**Null result confirmed by testing.** Deep Research scored 2.78/5 mean across pairings
in legal-no-policy mode. Below the 4.0 adoption threshold and lost to GPT-5.4 (2.67
vs 3.00) on the actual head-to-head. Judge reasoning: DR "overstates enforcement risk"
and "offers limited concrete rewrite guidance" — comprehensive legal citation without
actionable editorial fixes.

**Action items:**
- [x] Test complete — result documented in `poc-replacement/04-llm-skills-swap/RESULTS.md`
- [x] Decision recorded in `poc-replacement/DECISION-MATRIX.md`
- [ ] Legal-no-policy in production: served by GPT-5.4 with "best-effort, not legal
      advice" disclaimer banner
- [ ] Do NOT market a Deep Legal Audit tier — the quality isn't there
- [ ] Deep Research remains CheckApp's premium tier ONLY for fact-check (Plan 1's
      Engine C, validated there with novel methodological catches)

**Cost savings from skipping this tier:** ~$1.50/article × projected premium tier usage.
Money better spent on GPT-5.4 per-call cost for broader adoption.

---

### Phase 5 — Deprecation & cleanup (30+ days after last default-on)

- [ ] Drop `EXA_API_KEY` from required env (remains optional fallback)
- [ ] Drop Semantic Scholar dependency after OpenAlex stable for 60 days
- [ ] Archive `src/providers/semanticscholar.ts` under `src/providers/_legacy/`
- [ ] Archive MiniMax code for non-legal skills after GPT-5.4 default-on for 30 days
- [ ] Update README, pricing page, marketing copy per the benchmark-communication-policy

---

## Environment variable inventory

| Variable | Before | After | Status |
|---|---|---|---|
| `COPYSCAPE_USER` + `COPYSCAPE_KEY` | required | required | unchanged |
| `MINIMAX_API_KEY` | required | required (legal-w-policy only) | downgraded in importance |
| `EXA_API_KEY` | required | optional (fallback) | downgraded |
| `GEMINI_API_KEY` | required for Plan 2 | required | confirmed |
| `OPENAI_API_KEY` | — | **required** | **new** |
| `OPENALEX_MAILTO` | — | recommended | **new, optional** |
| `SEMANTIC_SCHOLAR_API_KEY` | — | optional (legacy fallback) | **new, optional** |

Net: +2 required keys (Gemini, OpenAI), -1 required (Exa → optional).

---

## Dashboard & UI changes

### New surfaces

1. **Per-skill provider indicator** — show which model produced each result (small
   "by MiniMax-M2.7" / "by GPT-5.4" tag). Supports the credibility + transparency
   pillars already in the fact-check UI.

2. **Plagiarism secondary signal banner** — when hybrid fires:
   > "Primary engine found marginal similarity (23%). Secondary analysis checked
   > specific phrases against the open web and found 2 near-verbatim passages from
   > `britannica.com`."

3. **AI Detection 4-state verdict card** — clearer than current binary indicator.

4. **"Find canonical source" button** on each Citations result — fires Gemini job,
   shows progress spinner, emails on completion.

5. **Premium tier pricing page** — position Deep Legal Audit + Deep Citations as
   Enterprise add-ons. Do NOT market against untested competitors; follow the
   benchmark-communication-policy.

### Removed surfaces

- Remove SS rate-limit error messages from citations UI (no longer can hit 429 on
  OpenAlex polite pool)
- Remove "Set Semantic Scholar API key" from config wizard (key becomes optional,
  not blocking)

---

## Testing strategy

### Unit tests
- [ ] OpenAlex client — mock response shape
- [ ] OpenAI client — mock response, cost calculation
- [ ] Per-skill provider resolver — given config + skill + context, returns correct
      provider
- [ ] Hybrid plagiarism trigger rule — edge cases (10%, 29%, exactly 30%)
- [ ] AI Detection 4-state verdict merge logic

### Integration tests
- [ ] Each new provider (OpenAI, OpenAlex) called against live API (separate CI job,
      can skip on PR but run nightly)
- [ ] Per-skill matrix config end-to-end: write config, call skill, verify provider
      used

### Regression tests
- [ ] All existing 160+ CLI tests continue to pass (same bar as Plan 2 Gate 2)
- [ ] Dashboard mirror tests pass
- [ ] Feature flag off = bit-identical output to pre-migration (golden-file test)

### Production canary
- [ ] 1% of paid traffic behind flag for 7 days minimum before 50% rollout
- [ ] Error rate dashboard alert: > 5% for > 1 hour pages someone
- [ ] Cost alert: daily spend > 2× baseline pages someone

---

## Success criteria per phase

| Phase | Gate to next phase |
|---|---|
| 0 Pre-work | All keys added to config, telemetry emitting, no functional regression |
| 1 SS → OpenAlex | Citations calls ≥ 95% success rate for 7 days |
| 2.2 GPT-5.4 skills | Each skill's per-call error rate ≤ 2%, user-reported-issue rate below baseline for 14 days |
| 3 Hybrid augment | Secondary firing-rate matches POC prediction ± 20%; no user complaints about confusing UI |
| 4 Premium tiers | At least 10 paying customers adopted the premium tier within 30 days, or revisit the pricing model |

---

## Rollback playbook

The existing rollback-playbook.md (Plan 2) covers fact-check. Extending:

- **Any Phase 2 migration shows > 5% error rate or user complaints:** flip the skill
  back to MiniMax in the matrix config. No code change, no deploy.
- **Hybrid plagiarism over-fires or under-fires:** toggle `plagiarism.hybrid: false`
  in config.
- **AI Detection 4-state confuses users:** toggle `aiDetection.hybrid: false`.
- **OpenAlex outage:** fall back to Semantic Scholar if API key is present (legacy
  code path retained for exactly this).
- **OpenAI outage:** Per-skill matrix `fallback` field kicks in → MiniMax/Gemini as
  configured. Each skill has a defined non-OpenAI fallback.
- **Cost overrun:** Daily budget check; if > 2× baseline, auto-disable premium
  features and alert engineering.

---

## Out of scope for this plan

- Grammar skill (LanguageTool) — not tested, no change
- Self-plagiarism (Cloudflare Vectorize) — user-private data, no LLM replacement
- SEO skill (rule-based) — no LLM replacement considered
- Mobile app integration — separate product decision
- Localization beyond Hebrew — not tested in POCs

---

## Known gaps & future work

1. ~~Deep Research Legal — cancelled based on two-mode testing~~. Both modes tested
   (with-policy Mode A, no-policy Mode B); DR lost or tied against standard LLMs.
   No further DR legal testing planned.

2. **GPT-5.4 judge bias** in POC 4 — all skill judgments used gpt-5.4-mini. Results are
   decisive enough to rule out bias alone, but an independent human review of 10 random
   pairs would strengthen the case pre-launch.

3. **AI Detection corpus** — all AI samples from Claude. Production rollout should test
   against GPT-generated, Gemini-generated, and Llama-generated samples before
   marketing claims.

4. **`.co.il` Hebrew news sources untested** — POC 1's Hebrew coverage was limited to
   `he.wikipedia.org` + `idi.org.il`. Production Hebrew plagiarism detection needs
   validation on real Israeli news content.

5. **Legal Mode B real-world corpus** — the current test articles were synthetic. Real
   pharma/finance content likely has denser legal-risk surfaces.

---

## Timeline estimate

Assuming one engineer full-time:

| Phase | Duration | Cumulative |
|---|---|---|
| 0 Pre-work | 2 days | 2 days |
| 1 SS → OpenAlex | 3 days | 1 week |
| 2.1 Matrix config | 3 days | 1.5 weeks |
| 2.2 Skill migrations (×5 sequentially) | 2 weeks | 3.5 weeks |
| 3.1 Plagiarism hybrid | 1 week | 4.5 weeks |
| 3.2 AI Detection hybrid | 1 week | 5.5 weeks |
| 4.1 Citations premium tier | 1.5 weeks | 7 weeks |
| 4.2 Legal premium (CANCELLED — DR null result) | 0 | — |
| 5 Deprecation | ongoing (30-day gates) | month 3-4 |

**~7 weeks end-to-end** to move the full matrix into production with proper gating.
(Legal premium tier cancelled after DR null result.)

---

## Approvals required before each phase

- Phase 0: Engineering manager (routine)
- Phase 1: Engineering manager + product (OpenAlex user-visible change)
- Phase 2: Product sign-off on per-skill matrix + cost model
- Phase 3: Product + design (new UI surfaces)
- Phase 4: Product + commercial (premium tier pricing, positioning)
- Phase 5: Engineering manager (cleanup)

All phases implicitly require passing the existing CI pipeline + the rollback-playbook
checklist.
