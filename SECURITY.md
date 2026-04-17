# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please **do not** open a public GitHub issue.

Instead, please report it privately via [GitHub Security Advisories](https://github.com/sharonds/checkapp/security/advisories/new).

I'll respond within 48 hours and aim to release a fix within 7 days for confirmed vulnerabilities.

## Outbound network requests

CheckApp's CLI and dashboard send article text and metadata to the following
third-party services when you explicitly enable and configure them. All are
BYOK (you supply the API key). CheckApp does not proxy or log these calls.

| Service | Purpose | Data sent | Key env var |
|---|---|---|---|
| Google Docs | Fetch article text | Document ID (via OAuth) | GOOGLE_APPLICATION_CREDENTIALS |
| Copyscape | Plagiarism + AI detection | Article text | COPYSCAPE_KEY |
| Exa AI | Fact-check source retrieval | Claims extracted from article | EXA_API_KEY |
| Parallel AI | Deep-reasoning fact check | Claims | PARALLEL_API_KEY |
| LanguageTool (managed) | Grammar/style | Article text (chunks < 20KB) | LANGUAGETOOL_API_KEY (optional) |
| Semantic Scholar | Academic citations | Query terms | (no key required) |
| Cloudflare Vectorize | Self-plagiarism embeddings | Article text + embeddings | CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN |
| OpenRouter | LLM fallback / tone / summary | Article excerpts | OPENROUTER_API_KEY |
| Anthropic | LLM fallback / tone / summary | Article excerpts | ANTHROPIC_API_KEY |
| MiniMax | LLM fallback / tone / summary | Article excerpts | MINIMAX_API_KEY |

Skills are opt-in. Disabling a skill or leaving its API key unset
guarantees CheckApp makes zero requests to that service.

## Dashboard network posture

The dashboard is **local-only by default**. `/api/providers`, `/api/config`,
`/api/skills`, `/api/contexts`, `/api/checks`, `/api/checks/[id]/tags` reject
non-loopback hostnames and require a CSRF token. `/api/estimate` is
loopback-guarded. Binding the dashboard to a non-loopback interface is
unsupported in v1.2.0.
