import { describe, it, expect } from "vitest";
import { computeSetupScore, type TenantSetupState } from "./setupScore";

function emptyState(): TenantSetupState {
  return {
    hasActiveConnection: false,
    hasAtLeastOneChatMessage: false,
    hasMfaEnabled: false,
    hasNotificationChannel: false,
    hasSavedQueryOrWatchlist: false,
    hasTeamMember: false,
  };
}

function fullState(): TenantSetupState {
  return {
    hasActiveConnection: true,
    hasAtLeastOneChatMessage: true,
    hasMfaEnabled: true,
    hasNotificationChannel: true,
    hasSavedQueryOrWatchlist: true,
    hasTeamMember: true,
  };
}

describe("tenant/setupScore/computeSetupScore", () => {
  describe("scoring boundaries", () => {
    it("all undone → 0%", () => {
      const r = computeSetupScore(emptyState());
      expect(r.percent).toBe(0);
      expect(r.doneCount).toBe(0);
    });

    it("all done → 100%", () => {
      const r = computeSetupScore(fullState());
      expect(r.percent).toBe(100);
      expect(r.doneCount).toBe(6);
    });

    it("half done → ~50%", () => {
      const state = emptyState();
      state.hasActiveConnection = true;
      state.hasAtLeastOneChatMessage = true;
      state.hasNotificationChannel = true;
      const r = computeSetupScore(state);
      expect(r.percent).toBe(50);
      expect(r.doneCount).toBe(3);
    });
  });

  describe("step list", () => {
    it("returns 6 steps total", () => {
      const r = computeSetupScore(emptyState());
      expect(r.steps).toHaveLength(6);
      expect(r.totalCount).toBe(6);
    });

    it("each step has key/label/done/href/priority", () => {
      const r = computeSetupScore(emptyState());
      for (const s of r.steps) {
        expect(typeof s.key).toBe("string");
        expect(typeof s.label).toBe("string");
        expect(typeof s.done).toBe("boolean");
        expect(s.href.startsWith("/dashboard/")).toBe(true);
        expect(typeof s.priority).toBe("number");
      }
    });

    it("step keys unique", () => {
      const r = computeSetupScore(emptyState());
      const keys = r.steps.map((s) => s.key);
      expect(new Set(keys).size).toBe(keys.length);
    });
  });

  describe("nextStep priority", () => {
    it("fresh tenant → next = ERP connection (priority 1)", () => {
      const r = computeSetupScore(emptyState());
      expect(r.nextStep?.key).toBe("connection");
    });

    it("connection done → next = first query", () => {
      const state = emptyState();
      state.hasActiveConnection = true;
      const r = computeSetupScore(state);
      expect(r.nextStep?.key).toBe("first_query");
    });

    it("all done → nextStep is null", () => {
      const r = computeSetupScore(fullState());
      expect(r.nextStep).toBeNull();
    });

    it("skips done steps in priority order", () => {
      const state = emptyState();
      state.hasActiveConnection = true;
      state.hasAtLeastOneChatMessage = true;
      state.hasNotificationChannel = true;
      const r = computeSetupScore(state);
      expect(r.nextStep?.key).toBe("saved_or_watchlist");
    });
  });

  describe("invariants", () => {
    it("percent is integer 0..100", () => {
      const states: TenantSetupState[] = [
        emptyState(),
        fullState(),
        { ...emptyState(), hasActiveConnection: true },
      ];
      for (const s of states) {
        const r = computeSetupScore(s);
        expect(Number.isInteger(r.percent)).toBe(true);
        expect(r.percent).toBeGreaterThanOrEqual(0);
        expect(r.percent).toBeLessThanOrEqual(100);
      }
    });

    it("doneCount ≤ totalCount", () => {
      const r = computeSetupScore(emptyState());
      expect(r.doneCount).toBeLessThanOrEqual(r.totalCount);
    });

    it("first 4 steps include core flow (connection, query, notif, save)", () => {
      const r = computeSetupScore(emptyState());
      const firstFour = r.steps.slice(0, 4).map((s) => s.key);
      expect(firstFour).toContain("connection");
      expect(firstFour).toContain("first_query");
      expect(firstFour).toContain("notification");
      expect(firstFour).toContain("saved_or_watchlist");
    });
  });

  describe("regression markers", () => {
    it("MFA step exists with security href", () => {
      const r = computeSetupScore(emptyState());
      const mfa = r.steps.find((s) => s.key === "mfa");
      expect(mfa?.href).toBe("/dashboard/security");
    });

    it("Team step exists with team href", () => {
      const r = computeSetupScore(emptyState());
      const team = r.steps.find((s) => s.key === "team");
      expect(team?.href).toBe("/dashboard/team");
    });
  });
});
