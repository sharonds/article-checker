import { test, expect } from "bun:test";
import type { SkillResult, Finding } from "./types.ts";

test("SkillResult has required shape", () => {
  const r: SkillResult = {
    skillId: "seo",
    name: "SEO",
    score: 72,
    verdict: "warn",
    summary: "3 of 5 checks passed",
    findings: [],
    costUsd: 0,
  };
  expect(r.score).toBe(72);
  expect(r.verdict).toBe("warn");
});

test("Finding has required shape", () => {
  const f: Finding = {
    severity: "warn",
    text: "Average sentence length is 28 words (target: <20)",
    quote: "Vitamin D is a group of structurally related fat-soluble compounds...",
  };
  expect(f.severity).toBe("warn");
});
