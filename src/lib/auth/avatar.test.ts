import { describe, it, expect } from "vitest";
import {
  isValidAvatarDataUrl,
  pickProfileUpdateAction,
} from "./avatar";

describe("auth/avatar/isValidAvatarDataUrl", () => {
  describe("valid data URLs", () => {
    it("data:image/png;base64,... → true", () => {
      expect(isValidAvatarDataUrl("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
    });

    it("data:image/jpeg;base64,... → true", () => {
      expect(isValidAvatarDataUrl("data:image/jpeg;base64,/9j/4AAQ=")).toBe(true);
    });

    it("data:image/webp;base64,... → true", () => {
      expect(isValidAvatarDataUrl("data:image/webp;base64,UklGRg==")).toBe(true);
    });

    it("data:image/gif;base64,... → true", () => {
      expect(isValidAvatarDataUrl("data:image/gif;base64,R0lGODlh")).toBe(true);
    });
  });

  describe("null / empty (caller semantics)", () => {
    it("null → true (no change)", () => {
      expect(isValidAvatarDataUrl(null)).toBe(true);
    });

    it("undefined → true (no change)", () => {
      expect(isValidAvatarDataUrl(undefined)).toBe(true);
    });

    it("empty string → true (explicit clear)", () => {
      expect(isValidAvatarDataUrl("")).toBe(true);
    });
  });

  describe("invalid formats", () => {
    it("raw http URL → false", () => {
      expect(isValidAvatarDataUrl("https://example.com/avatar.png")).toBe(false);
    });

    it("data:application/octet-stream → false (must be image/*)", () => {
      expect(isValidAvatarDataUrl("data:application/octet-stream;base64,xxx")).toBe(false);
    });

    it("data:text/html attack → false (no image/ prefix)", () => {
      expect(isValidAvatarDataUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    });

    it("relative file path → false", () => {
      expect(isValidAvatarDataUrl("/avatars/me.png")).toBe(false);
    });

    it("missing prefix → false", () => {
      expect(isValidAvatarDataUrl("iVBORw0KGgo")).toBe(false);
    });

    it("case-sensitive prefix (Data: rejected)", () => {
      expect(isValidAvatarDataUrl("Data:image/png;base64,xxx")).toBe(false);
    });
  });
});

describe("auth/avatar/pickProfileUpdateAction", () => {
  it("only 'avatar' → 'profile.avatar.update'", () => {
    expect(pickProfileUpdateAction(["avatar"])).toBe("profile.avatar.update");
  });

  it("only 'name' → 'profile.update'", () => {
    expect(pickProfileUpdateAction(["name"])).toBe("profile.update");
  });

  it("name + avatar → 'profile.update' (not avatar-only)", () => {
    expect(pickProfileUpdateAction(["name", "avatar"])).toBe("profile.update");
    expect(pickProfileUpdateAction(["avatar", "name"])).toBe("profile.update");
  });

  it("empty array → 'profile.update'", () => {
    expect(pickProfileUpdateAction([])).toBe("profile.update");
  });

  it("unknown single field → 'profile.update'", () => {
    expect(pickProfileUpdateAction(["something"])).toBe("profile.update");
  });

  it("multiple fields including avatar → 'profile.update'", () => {
    expect(pickProfileUpdateAction(["avatar", "x", "y"])).toBe("profile.update");
  });
});
