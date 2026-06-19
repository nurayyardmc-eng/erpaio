package validator

import "testing"

func TestValidateAllowsReads(t *testing.T) {
	ok := []string{
		"SELECT * FROM customers",
		"  select id from orders",
		"WITH t AS (SELECT 1) SELECT * FROM t",
		"SELECT TOP 3 sku FROM inventory WHERE warehouse = 'IST'",
	}
	for _, q := range ok {
		if err := Validate(q); err != nil {
			t.Errorf("expected valid, got %v for: %s", err, q)
		}
	}
}

func TestValidateRejectsNonReads(t *testing.T) {
	for _, q := range []string{"DELETE FROM customers", "UPDATE x SET y=1", "TRUNCATE TABLE t", ""} {
		if err := Validate(q); err == nil {
			t.Errorf("expected rejection for: %q", q)
		}
	}
}

func TestValidateRejectsUnsafePatterns(t *testing.T) {
	bad := []string{
		"SELECT * FROM t; DROP TABLE t",
		"SELECT * FROM t -- comment",
		"SELECT * FROM t /* block */",
		"SELECT * FROM t WHERE x = (EXEC xp_cmdshell 'dir')",
		"SELECT sp_executesql('x')",
		"SELECT * INTO OUTFILE '/tmp/x'",
		"SELECT LOAD_FILE('/etc/passwd')",
		"SELECT * FROM OPENROWSET('x')",
		"SELECT WAITFOR DELAY '0:0:5'",
	}
	for _, q := range bad {
		if err := Validate(q); err == nil {
			t.Errorf("expected unsafe rejection for: %s", q)
		}
	}
}
