// erpaio-agent — On-prem MSSQL execution agent for ERPAIO Cloud.
//
// Polls the cloud over outbound HTTPS for SQL jobs, validates + executes them
// against the local MSSQL (Nebim) instance, and posts results back. No inbound
// ports, no WebSocket. The DB credentials live only on this machine.
package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/nurayyardmc-eng/erpaio/agent/internal/config"
	"github.com/nurayyardmc-eng/erpaio/agent/internal/connection"
	"github.com/nurayyardmc-eng/erpaio/agent/internal/executor"
	"github.com/spf13/cobra"
)

const Version = "0.2.0"

var rootCmd = &cobra.Command{
	Use:     "erpaio-agent",
	Short:   "ERPAIO on-prem MSSQL execution agent",
	Version: Version,
}

var registerCmd = &cobra.Command{
	Use:   "register",
	Short: "Save cloud + local DB settings to ~/.erpaio-agent/config.yaml",
	RunE: func(cmd *cobra.Command, _ []string) error {
		f := cmd.Flags()
		token, _ := f.GetString("token")
		if token == "" {
			return errors.New("--token is required (Dashboard → Connections → Set up agent)")
		}
		cloud, _ := f.GetString("cloud")
		host, _ := f.GetString("db-host")
		port, _ := f.GetInt("db-port")
		name, _ := f.GetString("db-name")
		user, _ := f.GetString("db-user")
		pass, _ := f.GetString("db-password")

		c := &config.Config{
			Cloud: cloud, Token: token,
			DBHost: host, DBPort: port, DBName: name, DBUser: user, DBPassword: pass,
		}
		if err := c.Save(); err != nil {
			return err
		}
		p, _ := config.Path()
		fmt.Printf("Saved %s\nStart the agent with: erpaio-agent run\n", p)
		return nil
	},
}

var runCmd = &cobra.Command{
	Use:   "run",
	Short: "Run the agent (foreground): poll cloud, execute SQL locally, repeat",
	RunE: func(_ *cobra.Command, _ []string) error {
		c, err := config.Load()
		if err != nil {
			return err
		}
		exec, err := executor.Open(c.DSN())
		if err != nil {
			return err
		}
		defer exec.Close()

		ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
		defer stop()

		if err := exec.Ping(ctx); err != nil {
			return fmt.Errorf("cannot reach local DB %s:%d/%s: %w", c.DBHost, c.DBPort, c.DBName, err)
		}
		fmt.Printf("erpaio-agent %s — connected to %s:%d/%s, polling %s\n",
			Version, c.DBHost, c.DBPort, c.DBName, c.Cloud)

		err = connection.New(c.Cloud, c.Token, exec).Run(ctx)
		if errors.Is(err, context.Canceled) {
			fmt.Println("shutting down")
			return nil
		}
		return err
	},
}

var statusCmd = &cobra.Command{
	Use:   "status",
	Short: "Show agent config status",
	RunE: func(_ *cobra.Command, _ []string) error {
		c, err := config.Load()
		if err != nil {
			fmt.Printf("erpaio-agent %s — not registered (%v)\n", Version, err)
			return nil
		}
		fmt.Printf("erpaio-agent %s\n  cloud: %s\n  db:    %s:%d/%s (user %s)\n  token: %s…\n",
			Version, c.Cloud, c.DBHost, c.DBPort, c.DBName, c.DBUser, tokenPrefix(c.Token))
		return nil
	},
}

func tokenPrefix(s string) string {
	if len(s) <= 8 {
		return "set"
	}
	return s[:8]
}

func init() {
	registerCmd.Flags().String("cloud", "https://erpaio.vercel.app", "ERPAIO Cloud base URL")
	registerCmd.Flags().String("token", "", "Agent bearer token (from dashboard)")
	registerCmd.Flags().String("db-host", "localhost", "MSSQL host")
	registerCmd.Flags().Int("db-port", 1433, "MSSQL port")
	registerCmd.Flags().String("db-name", "", "MSSQL database name")
	registerCmd.Flags().String("db-user", "erpaio_readonly", "MSSQL read-only user")
	registerCmd.Flags().String("db-password", "", "MSSQL password")

	rootCmd.AddCommand(registerCmd, runCmd, statusCmd)
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}
