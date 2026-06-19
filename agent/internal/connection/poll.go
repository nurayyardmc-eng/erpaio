// Package connection is the agent's outbound HTTPS poll loop. It claims jobs
// from the cloud, validates + executes them locally, and posts results back.
// No inbound ports, no WebSocket — Vercel-serverless compatible.
package connection

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/nurayyardmc-eng/erpaio/agent/internal/executor"
	"github.com/nurayyardmc-eng/erpaio/agent/internal/validator"
)

type job struct {
	ID  string `json:"id"`
	SQL string `json:"sql"`
}

type resultBody struct {
	Rows  []map[string]interface{} `json:"rows,omitempty"`
	Error string                   `json:"error,omitempty"`
}

type Agent struct {
	Cloud        string
	Token        string
	Exec         *executor.Executor
	HTTP         *http.Client
	Poll         time.Duration
	QueryTimeout time.Duration
}

func New(cloud, token string, exec *executor.Executor) *Agent {
	return &Agent{
		Cloud:        cloud,
		Token:        token,
		Exec:         exec,
		HTTP:         &http.Client{Timeout: 30 * time.Second},
		Poll:         time.Second,
		QueryTimeout: 15 * time.Second,
	}
}

// Run loops until the context is cancelled. Transient errors back off; the loop
// keeps trying so a flaky network or a cloud restart self-heals.
func (a *Agent) Run(ctx context.Context) error {
	for {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		had, err := a.tick(ctx)
		if err != nil {
			fmt.Println("poll error:", err)
			sleep(ctx, a.Poll*3)
			continue
		}
		if !had {
			sleep(ctx, a.Poll)
		}
	}
}

// tick claims at most one job. Returns true if a job was handled.
func (a *Agent) tick(ctx context.Context) (bool, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, a.Cloud+"/api/agent/jobs/next", nil)
	if err != nil {
		return false, err
	}
	req.Header.Set("Authorization", "Bearer "+a.Token)

	resp, err := a.HTTP.Do(req)
	if err != nil {
		return false, err
	}
	defer func() {
		io.Copy(io.Discard, resp.Body)
		resp.Body.Close()
	}()

	switch resp.StatusCode {
	case http.StatusNoContent:
		return false, nil
	case http.StatusUnauthorized:
		return false, fmt.Errorf("unauthorized — check the agent token")
	case http.StatusOK:
		var j job
		if err := json.NewDecoder(resp.Body).Decode(&j); err != nil {
			return false, err
		}
		a.handle(ctx, j)
		return true, nil
	default:
		return false, fmt.Errorf("poll status %d", resp.StatusCode)
	}
}

func (a *Agent) handle(ctx context.Context, j job) {
	fmt.Printf("[job %s] executing\n", j.ID)
	// Defense in depth: re-validate locally even though the cloud already did.
	if err := validator.Validate(j.SQL); err != nil {
		a.postResult(ctx, j.ID, resultBody{Error: err.Error()})
		return
	}
	rows, err := a.Exec.Query(ctx, j.SQL, a.QueryTimeout)
	if err != nil {
		a.postResult(ctx, j.ID, resultBody{Error: err.Error()})
		return
	}
	a.postResult(ctx, j.ID, resultBody{Rows: rows})
	fmt.Printf("[job %s] -> %d rows\n", j.ID, len(rows))
}

func (a *Agent) postResult(ctx context.Context, id string, body resultBody) {
	data, err := json.Marshal(body)
	if err != nil {
		fmt.Println("marshal result error:", err)
		return
	}
	url := fmt.Sprintf("%s/api/agent/jobs/%s/result", a.Cloud, id)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(data))
	if err != nil {
		fmt.Println("build result request error:", err)
		return
	}
	req.Header.Set("Authorization", "Bearer "+a.Token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.HTTP.Do(req)
	if err != nil {
		fmt.Println("post result error:", err)
		return
	}
	io.Copy(io.Discard, resp.Body)
	resp.Body.Close()
}

func sleep(ctx context.Context, d time.Duration) {
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-ctx.Done():
	case <-t.C:
	}
}
