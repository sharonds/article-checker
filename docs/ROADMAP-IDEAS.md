# Article Checker — Roadmap Ideas

Ideas from Sharon, collected 2026-04-15. Prioritized by user impact.

## Done (Phase 1-3)
- ~~Content Summary skill (topic, audience, tone)~~
- ~~Legal suggestions ("Fix: replace with...")~~
- ~~SEO keyword detection + first-paragraph check~~
- ~~Custom skill authoring docs~~
- ~~Batch checking (`--batch ./articles/`)~~
- ~~Configurable thresholds per skill~~
- ~~Fact-check confidence levels~~
- ~~Readability score (Flesch-Kincaid + Easy/Medium/Difficult label)~~

## Done (Phase 4)
- ~~Report export (`--output report.md` / `--output report.html`)~~
- ~~Local web dashboard (`article-checker --ui`)~~
  - ~~Dashboard: stats, cost chart, verdict distribution~~
  - ~~Reports: browse history, view details~~
  - ~~Run Check: paste text or URL, attach tags~~
  - ~~Skills: toggle on/off, API key status, engine labels~~
  - ~~Settings: API key management with status dots, thresholds~~
  - ~~Docs: in-app onboarding, skill reference, score guide, API setup~~
  - ~~Dark mode (next-themes)~~
  - ~~Tags + search~~
  - ~~JSON API (docs/api.md)~~

## Phase 5 — Smart Content Features
- **Brief matching** — upload a brief/requirements doc, skill checks article against it (word count, topic coverage, key messages)
- **Content purpose detection** — product announcement, user guide, thought leadership, listicle, tutorial, case study
- **Word count enforcement** — "this article should be 200 words" → warn if over/under
- **Multi-language support** — detect article language, adjust SEO rules (Hebrew RTL, different stop words)
- **Regenerate/fix** — AI rewrites flagged sentences based on all skill feedback
- **Model comparison** — run same article through multiple LLM providers, compare results side by side
- **PDF/DOCX input** — parse uploaded documents, not just .md/.txt and Google Docs
- **Tone improvement suggestions** — suggest a rewritten version of each flagged sentence in brand voice
- **Citation recommendations** — when fact-check verifies a claim, suggest inline citations with source links

## Phase 6 — Team & Scale
- **User-configurable skills** — user writes a skill prompt in the dashboard, saved as a custom skill
- **Skill marketplace** — browse community-built skills, install with one click
- **Team dashboard** — multi-user, per-writer stats, trends over time
- **CMS integrations** — WordPress plugin, Ghost webhook, Webflow
- **CI/CD hook** — `article-checker --ci` returns exit code 1 if any skill fails (for PR gates)
- **Second AI detector** — Originality.ai cross-validation
- **Private index** — register your published articles so Copyscape excludes them
- **Vercel deployment** — optional cloud mode with auth
