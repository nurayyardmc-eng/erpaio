// Package validator — local SQL whitelist (defense in depth).
// Mirrors src/lib/validators/sql.ts (TypeScript) — same patterns.
package validator

import (
	"errors"
	"regexp"
)

var allowed = regexp.MustCompile(`(?i)^\s*(SELECT|WITH)`)

var blocked = []*regexp.Regexp{
	regexp.MustCompile(`(?i)\b(DROP|DELETE|UPDATE|INSERT|TRUNCATE|ALTER|CREATE|EXEC|EXECUTE|MERGE|GRANT|REVOKE|DENY|BACKUP|RESTORE|SHUTDOWN|RECONFIGURE|DBCC)\b`),
	regexp.MustCompile(`(?i)\bWAITFOR\s+(DELAY|TIME)\b`),
	regexp.MustCompile(`(?i)\bsp_(executesql|configure|trace|password|adduser|addlogin|addrole|delete_alert|cmdshell|OACreate|OAMethod)\b`),
	regexp.MustCompile(`(?i)\bxp_`),
	regexp.MustCompile(`(?i)\bsys\.fn_`),
	regexp.MustCompile(`;\s*\w`),
	regexp.MustCompile(`--`),
	regexp.MustCompile(`/\*`),
	regexp.MustCompile(`(?i)\bOPENROWSET\b`),
	regexp.MustCompile(`(?i)\bOPENDATASOURCE\b`),
	regexp.MustCompile(`(?i)\bOPENQUERY\b`),
	regexp.MustCompile(`(?i)\bBULK\s+INSERT\b`),
	regexp.MustCompile(`(?i)\bINTO\s+OUTFILE\b`),
	regexp.MustCompile(`(?i)\bLOAD_FILE\b`),
}

var (
	ErrNotSelect = errors.New("only SELECT or WITH allowed")
	ErrUnsafe    = errors.New("unsafe SQL pattern detected")
)

func Validate(sql string) error {
	if !allowed.MatchString(sql) {
		return ErrNotSelect
	}
	for _, p := range blocked {
		if p.MatchString(sql) {
			return ErrUnsafe
		}
	}
	return nil
}
