import { describe, it, expect } from "vitest";
import { validateSQL } from "./sql";

describe("validateSQL — defense in depth", () => {
  it("UNION SELECT INTO denenirse", () => {
    expect(() => validateSQL("SELECT * FROM x UNION SELECT * INTO OUTFILE '/tmp/dump' FROM y")).toThrow();
  });

  it("Stacked sub-query trick", () => {
    expect(() => validateSQL("SELECT (SELECT name FROM Users); DROP TABLE Users")).toThrow();
  });

  it("SQL Server extended procedure", () => {
    expect(() => validateSQL("SELECT * FROM x; EXEC xp_loginconfig")).toThrow();
  });

  it("nested comment trick", () => {
    expect(() => validateSQL("SELECT 1 /* * / DROP TABLE Users -- */")).toThrow();
  });

  it("legitimate complex SELECT geçer", () => {
    expect(() =>
      validateSQL(`
        WITH monthly AS (
          SELECT YEAR(FaturaTarihi) y, MONTH(FaturaTarihi) m, SUM(NetTutar) total
          FROM trFatura WHERE IptalDurumu = 0 AND FaturaTipi IN (1, 2)
          GROUP BY YEAR(FaturaTarihi), MONTH(FaturaTarihi)
        )
        SELECT * FROM monthly ORDER BY y DESC, m DESC
      `),
    ).not.toThrow();
  });
});
