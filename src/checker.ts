/**
 * Headless check engine — runs all enabled skills without any Ink/React UI.
 * Used by: MCP server, --ci, --json, dashboard API
 */
import { readConfig, type Config } from "./config.ts";
import { insertCheck, type CheckRecord } from "./db.ts";
import { fetchGoogleDoc, countWords } from "./gdoc.ts";
import { runCheckCore, loadContextsIntoConfig } from "./checker-core.ts";
import type { Skill, SkillResult } from "./skills/types.ts";
import { PlagiarismSkill } from "./skills/plagiarism.ts";
import { AiDetectionSkill } from "./skills/aidetection.ts";
import { SeoSkill } from "./skills/seo.ts";
import { FactCheckSkill } from "./skills/factcheck.ts";
import { FactCheckGroundedSkill } from "./skills/factcheck-grounded.ts";
import { ToneSkill } from "./skills/tone.ts";
import { LegalSkill } from "./skills/legal.ts";
import { SummarySkill } from "./skills/summary.ts";
import { BriefSkill } from "./skills/brief.ts";
import { PurposeSkill } from "./skills/purpose.ts";
import { GrammarSkill } from "./skills/grammar.ts";
import { AcademicSkill } from "./skills/academic.ts";
import { SelfPlagiarismSkill } from "./skills/selfplagiarism.ts";

export interface CheckResult {
  id: number;
  source: string;
  wordCount: number;
  results: SkillResult[];
  totalCostUsd: number;
}

export interface FactCheckSelection {
  flagOn: boolean;
  requestedTier: Config["factCheckTier"];
  effectiveTier: "basic" | "standard" | "premium";
  selectedImplementation: "basic" | "grounded";
  selectedSkillId: "fact-check" | "fact-check-grounded";
}

export function selectFactCheckSkill(config: Config): {
  skill: Skill;
  selection: FactCheckSelection;
} {
  const flagOn = config.factCheckTierFlag === true;
  const effectiveTier = flagOn ? (config.factCheckTier ?? "basic") : "basic";
  const selection: FactCheckSelection = {
    flagOn,
    requestedTier: config.factCheckTier,
    effectiveTier,
    selectedImplementation: effectiveTier === "standard" ? "grounded" : "basic",
    selectedSkillId: effectiveTier === "standard" ? "fact-check-grounded" : "fact-check",
  };

  // Telemetry hook: emit `selection` from checker-level instrumentation once
  // per-run telemetry is wired, so dashboards can distinguish requested vs.
  // effective fact-check tier and fallback behavior.
  const skill = selection.selectedImplementation === "grounded"
    ? new FactCheckGroundedSkill()
    : new FactCheckSkill();

  return { skill, selection };
}

export function buildSkills(config: Config): Skill[] {
  const skills: Skill[] = [];
  if (config.skills.plagiarism) skills.push(new PlagiarismSkill());
  if (config.skills.aiDetection) skills.push(new AiDetectionSkill());
  if (config.skills.seo) skills.push(new SeoSkill());
  if (config.skills.factCheck) skills.push(selectFactCheckSkill(config).skill);
  if (config.skills.tone) skills.push(new ToneSkill());
  if (config.skills.legal) skills.push(new LegalSkill());
  if (config.skills.summary) skills.push(new SummarySkill());
  if (config.skills.brief) skills.push(new BriefSkill());
  if (config.skills.purpose) skills.push(new PurposeSkill());
  if (config.skills.grammar) skills.push(new GrammarSkill());
  if (config.skills.academic) skills.push(new AcademicSkill());
  if (config.skills.selfPlagiarism) skills.push(new SelfPlagiarismSkill());
  return skills;
}

/**
 * Run all enabled skills headlessly (no Ink UI).
 *
 * @param source - File path, Google Doc URL, or label for the check
 * @param options.text - Article text (if already available; skips fetching)
 * @param options.config - Config override (defaults to readConfig())
 */
export async function runCheckHeadless(
  source: string,
  options?: { text?: string; config?: Config; dbPath?: string },
): Promise<CheckResult> {
  const baseConfig = options?.config ?? readConfig();
  const { config, db } = loadContextsIntoConfig(baseConfig, options?.dbPath);
  try {
    const text = options?.text ?? await fetchGoogleDoc(source);
    const wordCount = countWords(text);
    const { results, totalCostUsd } = await runCheckCore(text, config);
    const id = insertCheck(db, { source, wordCount, results, totalCostUsd, articleText: text });
    return { id, source, wordCount, results, totalCostUsd };
  } finally {
    db.close();
  }
}
