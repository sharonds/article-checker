import type { Finding, SkillResult } from "./types.ts";

export function normalizeFinding(raw: unknown): Finding {
  const f = raw as Partial<Finding> & Record<string, unknown>;
  const validClaimTypes = ["scientific", "medical", "financial", "general"] as const;
  const validConfidences = ["high", "medium", "low"] as const;
  return {
    severity: (f.severity ?? "info") as Finding["severity"],
    text: typeof f.text === "string" ? f.text : "",
    quote: typeof f.quote === "string" ? f.quote : undefined,
    sources: Array.isArray(f.sources) ? (f.sources as Finding["sources"]) : undefined,
    rewrite: typeof f.rewrite === "string" ? f.rewrite : undefined,
    citations: Array.isArray(f.citations) ? (f.citations as Finding["citations"]) : undefined,
    claimType: validClaimTypes.includes(f.claimType as never) ? (f.claimType as Finding["claimType"]) : undefined,
    confidence: validConfidences.includes(f.confidence as never) ? (f.confidence as Finding["confidence"]) : undefined,
  };
}

export function normalizeSkillResult(raw: unknown): SkillResult {
  const r = raw as Partial<SkillResult> & Record<string, unknown>;
  const validVerdicts = ["pass", "warn", "fail"] as const;
  return {
    skillId: typeof r.skillId === "string" ? r.skillId : "",
    name: typeof r.name === "string" ? r.name : "",
    score: typeof r.score === "number" ? r.score : 0,
    verdict: validVerdicts.includes(r.verdict as never) ? (r.verdict as SkillResult["verdict"]) : "warn",
    summary: typeof r.summary === "string" ? r.summary : "",
    findings: Array.isArray(r.findings) ? r.findings.map(normalizeFinding) : [],
    costUsd: typeof r.costUsd === "number" ? r.costUsd : 0,
    costBreakdown: r.costBreakdown && typeof r.costBreakdown === "object" ? (r.costBreakdown as Record<string, number>) : undefined,
    provider: typeof r.provider === "string" ? r.provider : undefined,
    error: typeof r.error === "string" ? r.error : undefined,
  };
}
