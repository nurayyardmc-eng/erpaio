// Package executor runs read-only SQL against the local MSSQL (Nebim) instance.
package executor

import (
	"context"
	"database/sql"
	"time"

	_ "github.com/microsoft/go-mssqldb"
)

type Executor struct {
	db *sql.DB
}

// Open creates a pooled MSSQL handle from a go-mssqldb DSN.
func Open(dsn string) (*Executor, error) {
	db, err := sql.Open("sqlserver", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(3)
	db.SetConnMaxIdleTime(5 * time.Minute)
	return &Executor{db: db}, nil
}

// Ping verifies connectivity (used on startup).
func (e *Executor) Ping(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	return e.db.PingContext(ctx)
}

func (e *Executor) Close() error { return e.db.Close() }

// Query runs a SELECT and returns rows as column→value maps. []byte values are
// coerced to strings so they marshal as JSON text (matches the cloud's shape).
func (e *Executor) Query(ctx context.Context, query string, timeout time.Duration) ([]map[string]interface{}, error) {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	rows, err := e.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	cols, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	out := make([]map[string]interface{}, 0)
	for rows.Next() {
		vals := make([]interface{}, len(cols))
		ptrs := make([]interface{}, len(cols))
		for i := range vals {
			ptrs[i] = &vals[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			return nil, err
		}
		row := make(map[string]interface{}, len(cols))
		for i, col := range cols {
			v := vals[i]
			if b, ok := v.([]byte); ok {
				v = string(b)
			}
			row[col] = v
		}
		out = append(out, row)
	}
	return out, rows.Err()
}
