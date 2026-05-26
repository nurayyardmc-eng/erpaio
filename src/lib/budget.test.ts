import { describe, it, expect } from "vitest";
import { computeBudgetStatus, totalAnthropicTokens, budgetExhaustedError } from "./budget";

describe("totalAnthropicTokens", () => {
  it("sums input + output tokens", () => {
    expect(totalAnthropicTokens({ input_tokens: 100, output_tokens: 50 })).toBe(150);
  });

  it("zero input/output → 0", () => {
    expect(totalAnthropicTokens({ input_tokens: 0, output_tokens: 0 })).toBe(0);
  });

  it("only input has value", () => {
    expect(totalAnthropicTokens({ input_tokens: 500, output_tokens: 0 })).toBe(500);
  });

  it("only output has value", () => {
    expect(totalAnthropicTokens({ input_tokens: 0, output_tokens: 75 })).toBe(75);
  });
});

describe("computeBudgetStatus", () => {
  const baseDate = new Date("2026-01-01T00:00:00Z");

  it("typical halfway used", () => {
    const status = computeBudgetStatus({
      monthlyTokensUsed: 1_000_000,
      monthlyTokenBudget: 2_000_000,
      budgetResetAt: baseDate,
    });
    expect(status.used).toBe(1_000_000);
    expect(status.budget).toBe(2_000_000);
    expect(status.remaining).toBe(1_000_000);
    expect(status.percentUsed).toBe(50);
  });

  it("zero used → 0% percent + full remaining", () => {
    const status = computeBudgetStatus({
      monthlyTokensUsed: 0,
      monthlyTokenBudget: 2_000_000,
      budgetResetAt: baseDate,
    });
    expect(status.percentUsed).toBe(0);
    expect(status.remaining).toBe(2_000_000);
  });

  it("fully consumed → 100% + 0 remaining", () => {
    const status = computeBudgetStatus({
      monthlyTokensUsed: 2_000_000,
      monthlyTokenBudget: 2_000_000,
      budgetResetAt: baseDate,
    });
    expect(status.percentUsed).toBe(100);
    expect(status.remaining).toBe(0);
  });

  it("over budget → clamps percent to 100 + remaining to 0", () => {
    const status = computeBudgetStatus({
      monthlyTokensUsed: 3_000_000,
      monthlyTokenBudget: 2_000_000,
      budgetResetAt: baseDate,
    });
    expect(status.percentUsed).toBe(100);
    expect(status.remaining).toBe(0);
  });

  it("zero budget → percent 0 (avoid divide-by-zero)", () => {
    const status = computeBudgetStatus({
      monthlyTokensUsed: 100,
      monthlyTokenBudget: 0,
      budgetResetAt: baseDate,
    });
    expect(status.percentUsed).toBe(0);
    expect(status.remaining).toBe(0);
  });

  it("resetsOn = budgetResetAt + 30 days", () => {
    const status = computeBudgetStatus({
      monthlyTokensUsed: 0,
      monthlyTokenBudget: 1,
      budgetResetAt: baseDate,
    });
    const expectedReset = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    expect(status.resetsOn.toISOString()).toBe(expectedReset.toISOString());
  });

  it("preserves resetAt as the original Date", () => {
    const status = computeBudgetStatus({
      monthlyTokensUsed: 0,
      monthlyTokenBudget: 1,
      budgetResetAt: baseDate,
    });
    expect(status.resetAt).toEqual(baseDate);
  });
});

describe("budgetExhaustedError", () => {
  function reqWithLang(lang: "tr" | "en"): Request {
    return new Request("https://example.test/api/x", {
      headers: { "accept-language": lang },
    });
  }

  it("returns 402 Payment Required", () => {
    const res = budgetExhaustedError(reqWithLang("tr"), { reason: "test reason" });
    expect(res.status).toBe(402);
  });

  it("uses budget.reason as both TR and EN message", async () => {
    const res = budgetExhaustedError(reqWithLang("tr"), {
      reason: "Aylık token bütçesi doldu.",
    });
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Aylık token bütçesi doldu.");
  });

  it("budget.reason wins regardless of locale (TR/EN both same)", async () => {
    const tr = budgetExhaustedError(reqWithLang("tr"), { reason: "X" });
    const en = budgetExhaustedError(reqWithLang("en"), { reason: "X" });
    expect(await tr.json()).toEqual(await en.json());
  });
});
