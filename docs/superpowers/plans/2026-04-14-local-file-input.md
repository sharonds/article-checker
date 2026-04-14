# Local File Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow `article-checker` to accept a local `.md` or `.txt` file path instead of (or in addition to) a Google Doc URL.

**Architecture:** Add an `isLocalPath()` guard in `src/gdoc.ts` that detects local paths by checking whether the argument starts with `/`, `./`, or `../`, or ends with `.md` or `.txt`. When detected, `fetchGoogleDoc()` reads the file with `readFileSync` and passes it through the existing `cleanText()` helper. The call site in `src/check.tsx` is unchanged — it still calls `fetchGoogleDoc(docUrl)` regardless.

**Tech Stack:** Bun, TypeScript, Node `fs` module (already available in Bun), Bun test runner.

---

## File Map

| File | Change |
|------|--------|
| `src/gdoc.ts` | Add `isLocalPath()` export, branch inside `fetchGoogleDoc()` |
| `src/gdoc.test.ts` | New — unit tests for `isLocalPath()` and local file reading |
| `README.md` | Update Usage section to show local file example |
| `CONTRIBUTING.md` | Update file table entry for `src/gdoc.ts` |

---

### Task 1: Add local file support to `src/gdoc.ts` with tests

**Files:**
- Modify: `src/gdoc.ts`
- Create: `src/gdoc.test.ts`

- [ ] **Step 1: Write failing tests first**

Create `src/gdoc.test.ts`:

```typescript
import { test, expect, describe } from "bun:test";
import { writeFileSync, unlinkSync } from "fs";
import { isLocalPath, fetchGoogleDoc } from "./gdoc.ts";

describe("isLocalPath", () => {
  test("absolute path is local", () => {
    expect(isLocalPath("/home/user/article.txt")).toBe(true);
  });

  test("relative path with ./ is local", () => {
    expect(isLocalPath("./article.md")).toBe(true);
  });

  test("relative path with ../ is local", () => {
    expect(isLocalPath("../article.md")).toBe(true);
  });

  test(".md extension is local", () => {
    expect(isLocalPath("article.md")).toBe(true);
  });

  test(".txt extension is local", () => {
    expect(isLocalPath("article.txt")).toBe(true);
  });

  test("Google Doc URL is not local", () => {
    expect(isLocalPath("https://docs.google.com/document/d/ABC123/edit")).toBe(false);
  });

  test("raw Doc ID is not local", () => {
    expect(isLocalPath("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms")).toBe(false);
  });
});

describe("fetchGoogleDoc with local file", () => {
  const TMP = "/tmp/article-checker-test.md";

  test("reads local .md file and returns cleaned text", async () => {
    writeFileSync(TMP, "# Hello\r\nThis is a test article.\r\n\r\n\r\nEnd.");
    try {
      const text = await fetchGoogleDoc(TMP);
      expect(text).toContain("Hello");
      expect(text).toContain("This is a test article.");
      expect(text).toContain("End.");
      // cleanText collapses 3+ blank lines to 2
      expect(text).not.toMatch(/\n{3,}/);
    } finally {
      unlinkSync(TMP);
    }
  });

  test("throws a clear error for a missing local file", async () => {
    await expect(fetchGoogleDoc("/tmp/does-not-exist-xyz.md")).rejects.toThrow(
      "File not found: /tmp/does-not-exist-xyz.md"
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/sharonsciammas/article-checker/.worktrees/feat-local-file
bun test src/gdoc.test.ts 2>&1
```

Expected: FAIL — `isLocalPath is not a function` (function doesn't exist yet).

- [ ] **Step 3: Implement `isLocalPath` and update `fetchGoogleDoc` in `src/gdoc.ts`**

Replace the entire file with:

```typescript
/**
 * Fetches plain text from a Google Doc or reads a local file.
 *
 * Google Docs: works automatically when the doc is shared publicly.
 * Local files: pass an absolute path (/path/to/file.md), relative path
 * (./file.md, ../file.md), or any path ending in .md or .txt.
 */
import { existsSync, readFileSync } from "fs";

/**
 * Returns true when the argument looks like a local file path rather than
 * a Google Doc URL or raw Doc ID.
 */
export function isLocalPath(input: string): boolean {
  return (
    input.startsWith("/") ||
    input.startsWith("./") ||
    input.startsWith("../") ||
    input.endsWith(".md") ||
    input.endsWith(".txt")
  );
}

export function extractDocId(url: string): string {
  // Handles formats:
  //   https://docs.google.com/document/d/DOC_ID/edit
  //   https://docs.google.com/document/d/DOC_ID/view
  //   https://docs.google.com/document/d/DOC_ID
  //   DOC_ID (raw ID passed directly)
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  // If no URL pattern matched, treat the whole string as a raw Doc ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(url)) return url;

  throw new Error(
    `Could not extract a Google Doc ID from: "${url}"\n` +
      `Make sure you paste the full URL, e.g.:\n` +
      `  https://docs.google.com/document/d/XXXX/edit`
  );
}

export async function fetchGoogleDoc(input: string): Promise<string> {
  if (isLocalPath(input)) {
    if (!existsSync(input)) {
      throw new Error(`File not found: ${input}`);
    }
    const raw = readFileSync(input, "utf-8");
    return cleanText(raw);
  }

  const docId = extractDocId(input);
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;

  const response = await fetch(exportUrl, {
    headers: {
      // Mimic a browser request so Google doesn't redirect to a login page
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
    redirect: "follow",
  });

  if (response.status === 403 || response.status === 401) {
    throw new Error(
      `Access denied (HTTP ${response.status}).\n\n` +
        `The document is private. Please share it:\n` +
        `  Google Docs → Share → Change to "Anyone with the link" → Viewer`
    );
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch Google Doc (HTTP ${response.status})`);
  }

  const text = await response.text();

  // Detect Google login redirect page (returned as 200 with HTML)
  if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
    throw new Error(
      `The document is private and requires login.\n\n` +
        `Please share it:\n` +
        `  Google Docs → Share → Change to "Anyone with the link" → Viewer`
    );
  }

  return cleanText(text);
}

function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")      // normalise line endings
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")  // collapse excessive blank lines
    .trim();
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun test src/gdoc.test.ts 2>&1
```

Expected: all 9 tests PASS.

- [ ] **Step 5: Run full test suite to verify no regressions**

```bash
bun test 2>&1
```

Expected: 23 pass, 0 fail (14 existing + 9 new).

- [ ] **Step 6: Commit**

```bash
git add src/gdoc.ts src/gdoc.test.ts
git commit -m "feat(gdoc): accept local .md/.txt file paths in addition to Google Doc URLs"
```

---

### Task 2: Update documentation

**Files:**
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`

- [ ] **Step 1: Update README Usage section**

Find the Usage section in `README.md`. It currently has:

```markdown
## Usage
```

Add a local file example below the Google Doc example. The updated Usage section should read:

```markdown
## Usage

```bash
# Check a Google Doc (must be shared publicly)
article-checker https://docs.google.com/document/d/YOUR_DOC_ID/edit

# Check a local Markdown or text file
article-checker ./my-article.md
article-checker /absolute/path/to/article.txt
```

**First run:** the setup wizard asks for your Copyscape credentials and saves them to `~/.article-checker/config.json`. You only do this once.
```

- [ ] **Step 2: Update CONTRIBUTING.md file table**

Find the file table entry for `src/gdoc.ts` in CONTRIBUTING.md. Update the description from:

```
| `src/gdoc.ts` | Google Doc fetcher — exports plain text via the public export URL |
```

to:

```
| `src/gdoc.ts` | Input reader — fetches Google Docs via public export URL or reads local `.md`/`.txt` files |
```

- [ ] **Step 3: Run full test suite one more time**

```bash
bun test 2>&1
```

Expected: 23 pass, 0 fail.

- [ ] **Step 4: Commit**

```bash
git add README.md CONTRIBUTING.md
git commit -m "docs: document local file input in README and CONTRIBUTING"
```
