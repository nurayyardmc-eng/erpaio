import { describe, it, expect } from "vitest";
import {
  shouldShowNps,
  npsCategory,
  nextDismissedUntil,
  NPS_RESUBMIT_COOLDOWN_DAYS,
  NPS_DISMISS_COOLDOWN_DAYS,
} from "./eligibility";

const DAY = 24 * 60 * 60_000;
const NOW = new Date("2026-05-26T12:00:00Z").getTime();

describe("nps/eligibility/shouldShowNps", () => {
  describe("first-time users (never submitted, never dismissed)", () => {
    it("→ show", () => {
      expect(
        shouldShowNps({ submittedAt: null, dismissedUntil: null, now: NOW }),
      ).toBe(true);
    });
  });

  describe("submission cool-down (90 days)", () => {
    it("submitted today → hide", () => {
      expect(
        shouldShowNps({ submittedAt: NOW, dismissedUntil: null, now: NOW }),
      ).toBe(false);
    });

    it("submitted 89 days ago → hide", () => {
      expect(
        shouldShowNps({
          submittedAt: NOW - 89 * DAY,
          dismissedUntil: null,
          now: NOW,
        }),
      ).toBe(false);
    });

    it("submitted exactly 90 days ago → show (boundary, strict less-than)", () => {
      expect(
        shouldShowNps({
          submittedAt: NOW - 90 * DAY,
          dismissedUntil: null,
          now: NOW,
        }),
      ).toBe(true);
    });

    it("submitted 91 days ago → show", () => {
      expect(
        shouldShowNps({
          submittedAt: NOW - 91 * DAY,
          dismissedUntil: null,
          now: NOW,
        }),
      ).toBe(true);
    });
  });

  describe("dismissal cool-down", () => {
    it("dismissedUntil in future → hide", () => {
      expect(
        shouldShowNps({
          submittedAt: null,
          dismissedUntil: NOW + 7 * DAY,
          now: NOW,
        }),
      ).toBe(false);
    });

    it("dismissedUntil exactly now → show (now < threshold, strict)", () => {
      expect(
        shouldShowNps({
          submittedAt: null,
          dismissedUntil: NOW,
          now: NOW,
        }),
      ).toBe(true);
    });

    it("dismissedUntil in past → show", () => {
      expect(
        shouldShowNps({
          submittedAt: null,
          dismissedUntil: NOW - 1 * DAY,
          now: NOW,
        }),
      ).toBe(true);
    });
  });

  describe("submission beats dismissal (long beats short)", () => {
    it("recent submission + expired dismissal → still hide", () => {
      expect(
        shouldShowNps({
          submittedAt: NOW - 30 * DAY,
          dismissedUntil: NOW - 1 * DAY,
          now: NOW,
        }),
      ).toBe(false);
    });
  });

  describe("defaults", () => {
    it("now omitted → uses Date.now() (doesn't throw)", () => {
      // Just exercise the default code path.
      const r = shouldShowNps({ submittedAt: null, dismissedUntil: null });
      expect(typeof r).toBe("boolean");
    });
  });

  it("cool-down constants documented (regression markers)", () => {
    expect(NPS_RESUBMIT_COOLDOWN_DAYS).toBe(90);
    expect(NPS_DISMISS_COOLDOWN_DAYS).toBe(14);
  });
});

describe("nps/eligibility/npsCategory", () => {
  it("0..6 → detractor", () => {
    for (const s of [0, 1, 2, 3, 4, 5, 6]) {
      expect(npsCategory(s)).toBe("detractor");
    }
  });

  it("7..8 → passive", () => {
    expect(npsCategory(7)).toBe("passive");
    expect(npsCategory(8)).toBe("passive");
  });

  it("9..10 → promoter", () => {
    expect(npsCategory(9)).toBe("promoter");
    expect(npsCategory(10)).toBe("promoter");
  });

  it("out-of-range → null (defensive)", () => {
    expect(npsCategory(-1)).toBeNull();
    expect(npsCategory(11)).toBeNull();
    expect(npsCategory(100)).toBeNull();
  });

  it("non-integer → null", () => {
    expect(npsCategory(7.5)).toBeNull();
    expect(npsCategory(NaN)).toBeNull();
  });

  it("boundary 6/7 and 8/9 transitions", () => {
    expect(npsCategory(6)).toBe("detractor");
    expect(npsCategory(7)).toBe("passive");
    expect(npsCategory(8)).toBe("passive");
    expect(npsCategory(9)).toBe("promoter");
  });
});

describe("nps/eligibility/nextDismissedUntil", () => {
  it("returns now + 14 days in ms", () => {
    expect(nextDismissedUntil(NOW)).toBe(NOW + 14 * DAY);
  });

  it("default now arg uses Date.now() (recent)", () => {
    const before = Date.now();
    const t = nextDismissedUntil();
    const after = Date.now();
    expect(t).toBeGreaterThanOrEqual(before + 14 * DAY);
    expect(t).toBeLessThanOrEqual(after + 14 * DAY);
  });
});
