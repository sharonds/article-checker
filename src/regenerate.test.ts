import { describe, it, expect } from "bun:test";
import { buildRegeneratePrompt, parseRegenerateResponse } from "./regenerate.ts";
import type { SkillResult } from "./skills/types.ts";

const mockResults: SkillResult[] = [{
  skillId: "tone", name: "Tone", score: 40, verdict: "fail",
  summary: "Poor tone",
  findings: [
    { severity: "warn", text: "Too formal", quote: "The implementation necessitates careful consideration." },
    { severity: "error", text: "Jargon", quote: "Leverage our synergistic paradigm." },
  ],
  costUsd: 0,
}];

describe("buildRegeneratePrompt", () => {
  it("includes article text", () => {
    const p = buildRegeneratePrompt("Article here.", mockResults, {});
    expect(p).toContain("Article here.");
  });
  it("includes findings with quotes", () => {
    const p = buildRegeneratePrompt("text", mockResults, {});
    expect(p).toContain("Too formal");
    expect(p).toContain("careful consideration");
  });
  it("includes tone guide context", () => {
    const p = buildRegeneratePrompt("text", mockResults, { "tone-guide": "Be warm and casual" });
    expect(p).toContain("Be warm and casual");
  });
  it("returns empty string when no fixable issues", () => {
    const noIssues: SkillResult[] = [{
      skillId: "seo", name: "SEO", score: 90, verdict: "pass",
      summary: "Good", findings: [{ severity: "info", text: "All good" }], costUsd: 0,
    }];
    expect(buildRegeneratePrompt("text", noIssues, {})).toBe("");
  });
});

describe("parseRegenerateResponse", () => {
  it("parses valid response", () => {
    const raw = JSON.stringify({
      rewrites: [{ original: "old", rewritten: "new", reason: "fix" }],
      summary: "1 rewrite",
    });
    const r = parseRegenerateResponse(raw);
    expect(r.rewrites).toHaveLength(1);
    expect(r.rewrites[0].rewritten).toBe("new");
  });
  it("parses fenced JSON", () => {
    const raw = '```json\n{"rewrites":[],"summary":"none"}\n```';
    const r = parseRegenerateResponse(raw);
    expect(r.rewrites).toHaveLength(0);
  });
});
