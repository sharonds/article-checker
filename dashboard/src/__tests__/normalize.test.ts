import { describe, test, expect } from "vitest";
import { normalizeFinding, normalizeSkillResult } from "@/lib/normalize";

describe("dashboard normalize mirror", () => {
  test("normalizeFinding handles null/undefined gracefully", () => {
    expect(normalizeFinding(null).text).toBe("");
    expect(normalizeFinding(undefined).severity).toBe("info");
  });

  test("normalizeSkillResult restores findings array from malformed blobs", () => {
    const r = normalizeSkillResult({
      findings: [null, "oops", { severity: "warn", text: "ok" }],
    });
    expect(r.findings).toHaveLength(3);
    expect(r.findings[2].text).toBe("ok");
  });
});
