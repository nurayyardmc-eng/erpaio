import { describe, it, expect } from "vitest";
import { connectionErrorHint } from "./connectionErrorHint";

describe("db/connectionErrorHint", () => {
  describe("network category", () => {
    it("ECONNREFUSED → network category", () => {
      const r = connectionErrorHint("Error: connect ECONNREFUSED 192.168.1.10:1433");
      expect(r.category).toBe("network");
      expect(r.title).toBe("Sunucuya bağlanılamadı");
    });

    it("'connection refused' (lowercase) matches", () => {
      const r = connectionErrorHint("connection refused");
      expect(r.category).toBe("network");
    });

    it("ETIMEDOUT → timeout hint", () => {
      const r = connectionErrorHint("Error: connect ETIMEDOUT 10.0.0.1:1433");
      expect(r.category).toBe("network");
      expect(r.title).toContain("timeout");
    });

    it("EHOSTUNREACH → unreachable hint", () => {
      const r = connectionErrorHint("EHOSTUNREACH");
      expect(r.category).toBe("network");
    });

    it("ENOTFOUND / getaddrinfo → DNS hint", () => {
      const r = connectionErrorHint("getaddrinfo ENOTFOUND db.invalid.local");
      expect(r.category).toBe("network");
      expect(r.title).toContain("DNS");
    });

    it("network hint mentions firewall/IP whitelist", () => {
      const r = connectionErrorHint("ECONNREFUSED");
      expect(r.hint.toLowerCase()).toMatch(/firewall|whitelist|ip/);
    });
  });

  describe("auth category", () => {
    it("'Login failed for user' (MS SQL) → auth", () => {
      const r = connectionErrorHint("Login failed for user 'erpaio_readonly'");
      expect(r.category).toBe("auth");
    });

    it("'password authentication failed' (Postgres) → auth", () => {
      const r = connectionErrorHint("FATAL: password authentication failed for user");
      expect(r.category).toBe("auth");
    });

    it("'authentication failed' (generic) → auth", () => {
      const r = connectionErrorHint("Authentication failed.");
      expect(r.category).toBe("auth");
    });

    it("auth hint mentions IT + kullanıcı/şifre", () => {
      const r = connectionErrorHint("Login failed for user");
      expect(r.hint.toLowerCase()).toMatch(/kullanıcı|şifre/);
    });

    it("login timeout → separate auth hint", () => {
      const r = connectionErrorHint("login timeout expired");
      expect(r.category).toBe("auth");
      expect(r.title).toContain("Auth timeout");
    });
  });

  describe("database category", () => {
    it("'Cannot open database' → DB not found", () => {
      const r = connectionErrorHint("Cannot open database \"NebimDB\" requested by the login");
      expect(r.category).toBe("database");
      expect(r.title).toBe("Veritabanı bulunamadı");
    });

    it("'database does not exist' (Postgres) → DB not found", () => {
      const r = connectionErrorHint("database \"erpdb\" does not exist");
      expect(r.category).toBe("database");
    });

    it("'permission denied' → access denied", () => {
      const r = connectionErrorHint("permission denied for table users");
      expect(r.category).toBe("database");
      expect(r.title).toBe("Erişim reddedildi");
    });

    it("DB hint references IT + okuma izni / SELECT", () => {
      const r = connectionErrorHint("Cannot open database 'foo'");
      expect(r.hint.toLowerCase()).toMatch(/yetki|select|datareader/);
    });
  });

  describe("tls category", () => {
    it("self-signed certificate → TLS", () => {
      const r = connectionErrorHint("self-signed certificate in certificate chain");
      expect(r.category).toBe("tls");
    });

    it("'SSL handshake failed' → TLS", () => {
      const r = connectionErrorHint("SSL handshake failed");
      expect(r.category).toBe("tls");
    });
  });

  describe("unknown fallback", () => {
    it("unrecognized error → unknown category with raw detail", () => {
      const r = connectionErrorHint("Some weird error from driver XYZ");
      expect(r.category).toBe("unknown");
      expect(r.hint).toContain("Some weird error from driver XYZ");
    });

    it("null error → unknown without detail", () => {
      const r = connectionErrorHint(null);
      expect(r.category).toBe("unknown");
      expect(r.hint).toContain("Detay yok");
    });

    it("undefined error → unknown without detail", () => {
      const r = connectionErrorHint(undefined);
      expect(r.category).toBe("unknown");
    });

    it("empty string → unknown without detail", () => {
      const r = connectionErrorHint("");
      expect(r.category).toBe("unknown");
    });
  });

  describe("output contract", () => {
    it("always returns title + hint + category", () => {
      const cases = ["ECONNREFUSED", "Login failed", "Cannot open database", "SSL", "weird", null];
      for (const c of cases) {
        const r = connectionErrorHint(c);
        expect(typeof r.title).toBe("string");
        expect(r.title.length).toBeGreaterThan(0);
        expect(typeof r.hint).toBe("string");
        expect(r.hint.length).toBeGreaterThan(0);
        expect(["network", "auth", "database", "tls", "unknown"]).toContain(r.category);
      }
    });

    it("case-insensitive matching (uppercase ECONNREFUSED)", () => {
      const r = connectionErrorHint("Error: ECONNREFUSED");
      expect(r.category).toBe("network");
    });
  });
});
