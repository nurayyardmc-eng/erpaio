import { describe, it, expect } from "vitest";
import { formatRelativeTime, formatTokens, formatTimestamp } from "./time";

const NOW = new Date("2026-05-26T12:00:00Z").getTime();
const MIN = 60_000;
const HR = 60 * MIN;
const DAY = 24 * HR;

describe("format/time/formatRelativeTime", () => {
  describe("null/missing input", () => {
    it("null → '—'", () => {
      expect(formatRelativeTime(null, "tr", NOW)).toBe("—");
      expect(formatRelativeTime(null, "en", NOW)).toBe("—");
    });
  });

  describe("Turkish locale (default)", () => {
    it("< 1 minute → 'az önce'", () => {
      expect(formatRelativeTime(new Date(NOW - 30_000).toISOString(), "tr", NOW)).toBe(
        "az önce",
      );
    });

    it("minutes 1-59 → 'Nd önce'", () => {
      expect(formatRelativeTime(new Date(NOW - 5 * MIN).toISOString(), "tr", NOW)).toBe(
        "5d önce",
      );
      expect(formatRelativeTime(new Date(NOW - 59 * MIN).toISOString(), "tr", NOW)).toBe(
        "59d önce",
      );
    });

    it("hours 1-23 → 'Nsa önce'", () => {
      expect(formatRelativeTime(new Date(NOW - 2 * HR).toISOString(), "tr", NOW)).toBe(
        "2sa önce",
      );
      expect(formatRelativeTime(new Date(NOW - 23 * HR).toISOString(), "tr", NOW)).toBe(
        "23sa önce",
      );
    });

    it("days → 'Ng önce'", () => {
      expect(formatRelativeTime(new Date(NOW - 1 * DAY).toISOString(), "tr", NOW)).toBe(
        "1g önce",
      );
      expect(formatRelativeTime(new Date(NOW - 30 * DAY).toISOString(), "tr", NOW)).toBe(
        "30g önce",
      );
    });

    it("unknown locale falls through to Turkish", () => {
      expect(formatRelativeTime(new Date(NOW - 5 * MIN).toISOString(), "ar", NOW)).toBe(
        "5d önce",
      );
    });
  });

  describe("English locale", () => {
    it("< 1 minute → 'just now'", () => {
      expect(formatRelativeTime(new Date(NOW - 30_000).toISOString(), "en", NOW)).toBe(
        "just now",
      );
    });

    it("minutes → 'Nm ago'", () => {
      expect(formatRelativeTime(new Date(NOW - 5 * MIN).toISOString(), "en", NOW)).toBe(
        "5m ago",
      );
    });

    it("hours → 'Nh ago'", () => {
      expect(formatRelativeTime(new Date(NOW - 3 * HR).toISOString(), "en", NOW)).toBe(
        "3h ago",
      );
    });

    it("days → 'Nd ago'", () => {
      expect(formatRelativeTime(new Date(NOW - 7 * DAY).toISOString(), "en", NOW)).toBe(
        "7d ago",
      );
    });
  });

  describe("boundary transitions", () => {
    it("exactly 60 minutes → '1sa önce' (hour tier)", () => {
      expect(formatRelativeTime(new Date(NOW - 60 * MIN).toISOString(), "tr", NOW)).toBe(
        "1sa önce",
      );
    });

    it("exactly 24 hours → '1g önce' (day tier)", () => {
      expect(formatRelativeTime(new Date(NOW - 24 * HR).toISOString(), "tr", NOW)).toBe(
        "1g önce",
      );
    });
  });

  describe("future timestamps (defensive)", () => {
    it("future → '0d önce' / '0m ago' (Math.floor of negative)", () => {
      // diff is negative; Math.floor(-0.5 ms / 60_000) = -1 minute. The function
      // returns "az önce" because -1 < 1.
      const future = new Date(NOW + 10 * MIN).toISOString();
      // The expected behavior: shows "az önce" / "just now" since min < 1.
      expect(formatRelativeTime(future, "tr", NOW)).toBe("az önce");
      expect(formatRelativeTime(future, "en", NOW)).toBe("just now");
    });
  });

  describe("default now arg", () => {
    it("uses Date.now() when omitted", () => {
      // Recent past — should not throw and should produce a Turkish string.
      const r = formatRelativeTime(new Date(Date.now() - 5 * MIN).toISOString(), "tr");
      expect(r).toMatch(/önce$/);
    });
  });
});

describe("format/time/formatTokens", () => {
  it("< 1k → locale-formatted integer", () => {
    expect(formatTokens(0)).toBe("0");
    expect(formatTokens(999)).toBe("999");
  });

  it("1k tier with no decimals (settings UI is narrow)", () => {
    expect(formatTokens(1_000)).toBe("1k");
    expect(formatTokens(1_999)).toBe("2k"); // toFixed(0) rounds
    expect(formatTokens(50_000)).toBe("50k");
  });

  it("1M tier with 1 decimal", () => {
    expect(formatTokens(1_000_000)).toBe("1.0M");
    expect(formatTokens(2_500_000)).toBe("2.5M");
    expect(formatTokens(15_400_000)).toBe("15.4M");
  });

  it("billions still rendered as M (no B tier)", () => {
    expect(formatTokens(1_500_000_000)).toBe("1500.0M");
  });

  it("exactly 1000 boundary moves to k tier", () => {
    expect(formatTokens(999)).toBe("999");
    expect(formatTokens(1_000)).toBe("1k");
  });

  it("exactly 1_000_000 boundary moves to M tier", () => {
    expect(formatTokens(999_999)).toBe("1000k");
    expect(formatTokens(1_000_000)).toBe("1.0M");
  });
});

describe("format/time/formatTimestamp", () => {
  const FIXED_ISO = "2026-05-26T12:34:56Z";

  it("null/undefined → '—'", () => {
    expect(formatTimestamp(null)).toBe("—");
    expect(formatTimestamp(undefined)).toBe("—");
  });

  it("empty string → '—'", () => {
    expect(formatTimestamp("")).toBe("—");
  });

  it("invalid ISO → '—'", () => {
    expect(formatTimestamp("not-a-date")).toBe("—");
  });

  it("TR locale (default) produces a TR-tagged string", () => {
    const r = formatTimestamp(FIXED_ISO, "tr");
    // Locale string format varies by Node version, just assert key signals.
    expect(r).toContain("2026");
    expect(typeof r).toBe("string");
    expect(r).not.toBe("—");
  });

  it("EN locale produces a different formatted string", () => {
    const tr = formatTimestamp(FIXED_ISO, "tr");
    const en = formatTimestamp(FIXED_ISO, "en");
    expect(en).not.toBe(tr);
    expect(en).toContain("2026");
  });

  it("unknown locale → falls back to TR", () => {
    const r = formatTimestamp(FIXED_ISO, "ar");
    const tr = formatTimestamp(FIXED_ISO, "tr");
    expect(r).toBe(tr);
  });

  it("accepts Date instance directly", () => {
    const d = new Date(FIXED_ISO);
    const fromDate = formatTimestamp(d);
    const fromIso = formatTimestamp(FIXED_ISO);
    expect(fromDate).toBe(fromIso);
  });

  it("default locale is TR (omitting arg)", () => {
    expect(formatTimestamp(FIXED_ISO)).toBe(formatTimestamp(FIXED_ISO, "tr"));
  });
});
