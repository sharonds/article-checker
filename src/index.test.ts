import { describe, expect, it, beforeEach } from "bun:test";
import { resolveDeepFactCheckEnv } from "./index.tsx";

describe("resolveDeepFactCheckEnv", () => {
  it("accepts --deep-fact-check with EXA_API_KEY env var even without config file", () => {
    const result = resolveDeepFactCheckEnv({ configExists: () => false, env: { EXA_API_KEY: "exa-test" } });
    expect(result.allowed).toBe(true);
    expect(result.apiKey).toBe("exa-test");
  });

  it("rejects --deep-fact-check when no env key and no config", () => {
    const result = resolveDeepFactCheckEnv({ configExists: () => false, env: {} });
    expect(result.allowed).toBe(false);
  });
});
