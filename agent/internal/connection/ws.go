// Package connection — Cloud WebSocket client (skeleton).
// Faza 10.6'da full impl: reconnect, mTLS, message routing.
package connection

import (
	"context"
	"errors"
)

type CloudMessage struct {
	Type string `json:"type"` // "execute_sql" | "ping" | "shutdown"
	ID   string `json:"id"`
	SQL  string `json:"sql,omitempty"`
}

type ResultReply struct {
	Type string                   `json:"type"` // "result" | "error"
	ID   string                   `json:"id"`
	Rows []map[string]interface{} `json:"rows,omitempty"`
	Err  string                   `json:"error,omitempty"`
}

type Client struct {
	URL   string
	Token string
}

func New(url, token string) *Client {
	return &Client{URL: url, Token: token}
}

func (c *Client) Run(_ context.Context, _ chan<- CloudMessage, _ <-chan ResultReply) error {
	return errors.New("skeleton — implement with gorilla/websocket")
}
