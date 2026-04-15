# Agent Integration Guide

Article Checker can be used by AI agents via MCP tools or CLI commands.

## MCP Server (Claude Code, Cursor, Windsurf)

Start the MCP server:

    article-checker --mcp

Or add to your MCP config (e.g., `.claude/settings.json`):

    {
      "mcpServers": {
        "article-checker": {
          "command": "bun",
          "args": ["run", "src/index.tsx", "--mcp"]
        }
      }
    }

### Available MCP tools

| Tool | Description | Required params |
|------|-------------|----------------|
| `check_article` | Run quality checks on article text | `text` |
| `list_reports` | Browse check history | - |
| `get_report` | Get full report by ID | `id` |
| `upload_context` | Save a tone guide, brief, or legal policy | `type`, `content` |
| `list_contexts` | View saved context documents | - |
| `get_skills` | See which skills are enabled | - |
| `toggle_skill` | Enable/disable a skill | `skillId`, `enabled` |

### Example: Check an article from Claude Code

    Use the check_article tool with:
    - text: "Your article content here..."
    - source: "my-article.md"

### Example: Upload a tone guide

    Use the upload_context tool with:
    - type: "tone-guide"
    - name: "Brand Voice"
    - content: "Write in second person. Be warm and conversational..."

## CLI Commands (scripts, CI/CD, OpenClaw)

    # Check an article (with Ink UI)
    article-checker ./article.md

    # Headless check with JSON output
    article-checker --json ./article.md

    # CI mode — exits 1 if any skill fails
    article-checker --ci ./article.md

    # Batch check a directory
    article-checker --batch ./articles/

    # Export report
    article-checker --output report.md ./article.md

    # Manage contexts
    article-checker context add tone-guide ./brand-voice.md
    article-checker context add legal-policy ./legal-requirements.md
    article-checker context add brief ./campaign-brief.md
    article-checker context list
    article-checker context show tone-guide
    article-checker context remove brief

## Context Types

| Type | Used by skill | Purpose |
|------|--------------|---------|
| `tone-guide` | Tone of Voice | Brand voice rules |
| `legal-policy` | Legal Risk | Company legal requirements |
| `brief` | Brief Matching | Content brief with requirements |
| `style-guide` | SEO + Tone | Writing style rules |
| `custom` | Custom skills | Any additional context |

## Data Storage

All data is local:
- Check history: `~/.article-checker/history.db` (SQLite)
- Config: `~/.article-checker/config.json`
- Contexts: stored in the SQLite database

No remote servers. No authentication needed for local use.
