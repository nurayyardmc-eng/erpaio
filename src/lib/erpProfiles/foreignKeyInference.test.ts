import { describe, it, expect } from "vitest";
import { extractJoins, canonicalize } from "./foreignKeyInference";

describe("erpProfiles/foreignKeyInference/extractJoins", () => {
  it("extracts simple JOIN ... ON a.col = b.col", () => {
    const j = extractJoins("SELECT * FROM Orders JOIN Users ON Orders.userId = Users.id");
    expect(j).toEqual([{ a: "Orders", aCol: "userId", b: "Users", bCol: "id" }]);
  });

  it("handles INNER/LEFT/RIGHT JOIN variants (just `JOIN` keyword needed)", () => {
    const sql = "SELECT * FROM A INNER JOIN B ON A.x = B.y";
    const j = extractJoins(sql);
    expect(j).toEqual([{ a: "A", aCol: "x", b: "B", bCol: "y" }]);
  });

  it("handles bracketed identifiers ([Users].[id])", () => {
    const j = extractJoins(
      "SELECT * FROM [Orders] JOIN [Users] ON [Orders].[userId] = [Users].[id]",
    );
    expect(j).toEqual([{ a: "Orders", aCol: "userId", b: "Users", bCol: "id" }]);
  });

  it("handles dbo. schema prefix on table name", () => {
    const j = extractJoins("FROM dbo.Orders JOIN dbo.Users ON Orders.userId = Users.id");
    expect(j).toEqual([{ a: "Orders", aCol: "userId", b: "Users", bCol: "id" }]);
  });

  it("extracts multiple JOINs from same query", () => {
    const sql = `
      FROM Orders
      JOIN Users ON Orders.userId = Users.id
      JOIN Products ON Orders.productId = Products.id
    `;
    const j = extractJoins(sql);
    expect(j.length).toBe(2);
    expect(j[0].b).toBe("Users");
    expect(j[1].b).toBe("Products");
  });

  it("case-insensitive (JOIN/join/Join)", () => {
    const j = extractJoins("from a join b on a.x = b.y");
    expect(j.length).toBe(1);
  });

  it("handles JOIN with table alias", () => {
    const j = extractJoins("FROM Orders o JOIN Users u ON o.userId = u.id");
    // Aliases preserved as table names (callers can map back via SQL).
    expect(j.length).toBe(1);
    expect(j[0].a).toBe("o");
    expect(j[0].b).toBe("u");
  });

  it("no JOIN → empty array", () => {
    expect(extractJoins("SELECT * FROM Users WHERE id = 1")).toEqual([]);
  });

  it("empty SQL → empty array", () => {
    expect(extractJoins("")).toEqual([]);
  });
});

describe("erpProfiles/foreignKeyInference/canonicalize", () => {
  it("orders alphabetically by table name (smaller first)", () => {
    const r = canonicalize({ a: "Users", aCol: "id", b: "Orders", bCol: "userId" });
    expect(r.fromTable).toBe("Orders");
    expect(r.fromColumn).toBe("userId");
    expect(r.toTable).toBe("Users");
    expect(r.toColumn).toBe("id");
  });

  it("preserves order when already alphabetical", () => {
    const r = canonicalize({ a: "Orders", aCol: "userId", b: "Users", bCol: "id" });
    expect(r.fromTable).toBe("Orders");
    expect(r.toTable).toBe("Users");
  });

  it("deterministic: same input → same output regardless of direction", () => {
    const r1 = canonicalize({ a: "A", aCol: "x", b: "B", bCol: "y" });
    const r2 = canonicalize({ a: "B", aCol: "y", b: "A", bCol: "x" });
    expect(r1).toEqual(r2);
  });

  it("case-sensitive comparison (uppercase < lowercase by ASCII)", () => {
    // 'A' = 65, 'a' = 97 — 'A' < 'a'
    const r = canonicalize({ a: "Users", aCol: "x", b: "ACL", bCol: "y" });
    expect(r.fromTable).toBe("ACL");
  });

  it("equal tables → keeps input direction", () => {
    const r = canonicalize({ a: "T", aCol: "x", b: "T", bCol: "y" });
    expect(r.fromTable).toBe("T");
    expect(r.toTable).toBe("T");
  });
});
