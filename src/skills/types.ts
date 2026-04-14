import type { Config } from "../config.ts";

export type Verdict = "pass" | "warn" | "fail";
export type Severity = "info" | "warn" | "error";

export interface Finding {
  severity: Severity;
  text: string;
  quote?: string;
}

export interface SkillResult {
  skillId: string;
  name: string;
  score: number;       // 0–100
  verdict: Verdict;
  summary: string;
  findings: Finding[];
  costUsd: number;
  error?: string;
}

export interface Skill {
  id: string;
  name: string;
  run(text: string, config: Config): Promise<SkillResult>;
}
