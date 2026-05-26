import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getIyzicoConfig,
  isIyzicoConfigured,
  isPaymentProviderConfigured,
  pickPaymentProvider,
} from "./iyzico";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.IYZICO_API_KEY;
  delete process.env.IYZICO_SECRET_KEY;
  delete process.env.IYZICO_BASE_URL;
  delete process.env.STRIPE_SECRET_KEY;
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

describe("billing/iyzico/getIyzicoConfig", () => {
  it("both keys missing → null", () => {
    expect(getIyzicoConfig()).toBeNull();
  });

  it("only API_KEY → null", () => {
    process.env.IYZICO_API_KEY = "test-key";
    expect(getIyzicoConfig()).toBeNull();
  });

  it("only SECRET_KEY → null", () => {
    process.env.IYZICO_SECRET_KEY = "test-secret";
    expect(getIyzicoConfig()).toBeNull();
  });

  it("both keys present → config object", () => {
    process.env.IYZICO_API_KEY = "test-key";
    process.env.IYZICO_SECRET_KEY = "test-secret";
    const cfg = getIyzicoConfig();
    expect(cfg).toEqual({
      apiKey: "test-key",
      secretKey: "test-secret",
      baseUrl: "https://sandbox-api.iyzipay.com",
    });
  });

  it("custom BASE_URL overrides default", () => {
    process.env.IYZICO_API_KEY = "k";
    process.env.IYZICO_SECRET_KEY = "s";
    process.env.IYZICO_BASE_URL = "https://api.iyzipay.com";
    expect(getIyzicoConfig()?.baseUrl).toBe("https://api.iyzipay.com");
  });

  it("default base URL is sandbox (safe default — regression marker)", () => {
    process.env.IYZICO_API_KEY = "k";
    process.env.IYZICO_SECRET_KEY = "s";
    expect(getIyzicoConfig()?.baseUrl).toBe("https://sandbox-api.iyzipay.com");
  });
});

describe("billing/iyzico/isIyzicoConfigured", () => {
  it("false when keys missing", () => {
    expect(isIyzicoConfigured()).toBe(false);
  });

  it("true when both keys present", () => {
    process.env.IYZICO_API_KEY = "k";
    process.env.IYZICO_SECRET_KEY = "s";
    expect(isIyzicoConfigured()).toBe(true);
  });
});

describe("billing/iyzico/isPaymentProviderConfigured", () => {
  it("false when neither iyzico nor stripe", () => {
    expect(isPaymentProviderConfigured()).toBe(false);
  });

  it("true with only iyzico", () => {
    process.env.IYZICO_API_KEY = "k";
    process.env.IYZICO_SECRET_KEY = "s";
    expect(isPaymentProviderConfigured()).toBe(true);
  });

  it("true with only stripe", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    expect(isPaymentProviderConfigured()).toBe(true);
  });

  it("true with both", () => {
    process.env.IYZICO_API_KEY = "k";
    process.env.IYZICO_SECRET_KEY = "s";
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    expect(isPaymentProviderConfigured()).toBe(true);
  });
});

describe("billing/iyzico/pickPaymentProvider", () => {
  it("nothing configured → 'manual' (admin contact)", () => {
    expect(pickPaymentProvider()).toBe("manual");
  });

  it("iyzico configured → 'iyzico' (TR priority)", () => {
    process.env.IYZICO_API_KEY = "k";
    process.env.IYZICO_SECRET_KEY = "s";
    expect(pickPaymentProvider()).toBe("iyzico");
  });

  it("only stripe → 'stripe'", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    expect(pickPaymentProvider()).toBe("stripe");
  });

  it("iyzico wins over stripe (TR-first)", () => {
    process.env.IYZICO_API_KEY = "k";
    process.env.IYZICO_SECRET_KEY = "s";
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    expect(pickPaymentProvider()).toBe("iyzico");
  });
});
