import { describe, it, expect } from "bun:test";
import { buildBriefPrompt } from "./brief.ts";

describe("buildBriefPrompt", () => {
  it("includes article and brief text", () => {
    const prompt = buildBriefPrompt("Article about TypeScript", "Write 500 words about TypeScript best practices");
    expect(prompt).toContain("TypeScript");
    expect(prompt).toContain("500 words");
  });
  it("requests structured JSON with covered/missing", () => {
    const prompt = buildBriefPrompt("text", "brief");
    expect(prompt).toContain('"covered"');
    expect(prompt).toContain('"missing"');
    expect(prompt).toContain('"suggestions"');
  });
});
