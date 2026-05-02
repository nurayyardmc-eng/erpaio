// erpaio-agent — On-prem MSSQL gateway for ERPAIO Cloud.
// Skeleton: only CLI structure + entry. Full implementation in internal/.
package main

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

const Version = "0.1.0-skeleton"

var rootCmd = &cobra.Command{
	Use:     "erpaio-agent",
	Short:   "ERPAIO on-prem MSSQL execution agent",
	Version: Version,
}

var registerCmd = &cobra.Command{
	Use:   "register",
	Short: "Register this agent with ERPAIO Cloud",
	RunE: func(cmd *cobra.Command, args []string) error {
		fmt.Println("[skeleton] register: cloud handshake + persist config")
		return nil
	},
}

var runCmd = &cobra.Command{
	Use:   "run",
	Short: "Run the agent (foreground)",
	RunE: func(cmd *cobra.Command, args []string) error {
		fmt.Println("[skeleton] run: connect to cloud, execute SQL, audit, repeat")
		fmt.Println("Faza 10.6 deliverable — full impl 3-4 gün")
		return nil
	},
}

var statusCmd = &cobra.Command{
	Use:   "status",
	Short: "Show agent status",
	RunE: func(cmd *cobra.Command, args []string) error {
		fmt.Printf("erpaio-agent %s · skeleton\n", Version)
		fmt.Println("Bu sürüm üretim için kullanılmaz, sadece yapı referansı.")
		return nil
	},
}

var installServiceCmd = &cobra.Command{
	Use:   "install-service",
	Short: "Install as systemd / launchd / Windows Service",
	RunE: func(cmd *cobra.Command, args []string) error {
		fmt.Println("[skeleton] install-service: platform-specific service registration")
		return nil
	},
}

func init() {
	registerCmd.Flags().String("tenant", "", "ERPAIO tenant ID")
	registerCmd.Flags().String("token", "", "Agent registration token (erpaio_agent_...)")
	registerCmd.Flags().String("db-host", "localhost", "MSSQL host")
	registerCmd.Flags().Int("db-port", 1433, "MSSQL port")
	registerCmd.Flags().String("db-name", "", "MSSQL database name")
	registerCmd.Flags().String("db-user", "erpaio_readonly", "MSSQL read-only user")
	registerCmd.Flags().String("db-password", "", "MSSQL password")
	registerCmd.Flags().String("cloud", "wss://erpaio.vercel.app/api/agent/ws", "ERPAIO Cloud WebSocket URL")

	rootCmd.AddCommand(registerCmd, runCmd, statusCmd, installServiceCmd)
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}
