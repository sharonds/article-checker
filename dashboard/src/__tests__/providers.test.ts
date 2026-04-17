import { describe, test, expect, vi, beforeEach } from "vitest";

// Mock config + csrf reads
vi.mock("@/lib/config", () => ({
  readAppConfig: vi.fn(() => ({ providers: {} })),
  writeAppConfig: vi.fn(() => {}),
}));

vi.mock("@/lib/csrf", () => ({
  getCsrfToken: vi.fn(() => "test-csrf-token"),
}));

import { GET, PUT } from "@/app/api/providers/route";

describe("/api/providers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("GET returns providers map", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.providers).toEqual({});
    expect(json.hasKey).toEqual({});
  });

  test("PUT accepts valid body with correct CSRF + localhost host", async () => {
    const req = new Request("http://localhost:3000/api/providers", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-checkapp-csrf": "test-csrf-token",
        host: "localhost:3000",
      },
      body: JSON.stringify({ skillId: "fact-check", provider: "exa-search", apiKey: "k" }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  test("PUT rejects missing CSRF token", async () => {
    const req = new Request("http://localhost:3000/api/providers", {
      method: "PUT",
      headers: { "Content-Type": "application/json", host: "localhost:3000" },
      body: JSON.stringify({ skillId: "fact-check", provider: "exa-search", apiKey: "k" }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(403);
  });

  test("PUT rejects wrong CSRF token", async () => {
    const req = new Request("http://localhost:3000/api/providers", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-checkapp-csrf": "wrong",
        host: "localhost:3000",
      },
      body: JSON.stringify({ skillId: "fact-check", provider: "exa-search", apiKey: "k" }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(403);
  });

  test("PUT rejects non-localhost host", async () => {
    const req = new Request("http://evil.com/api/providers", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-checkapp-csrf": "test-csrf-token",
        host: "evil.com",
      },
      body: JSON.stringify({ skillId: "fact-check", provider: "exa-search", apiKey: "k" }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(403);
  });
});
