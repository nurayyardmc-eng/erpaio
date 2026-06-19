// Package config persists the agent's cloud + local-DB settings to
// ~/.erpaio-agent/config.yaml. The bearer token binds the agent to one
// ERPAIO connection; the DB credentials never leave this machine.
package config

import (
	"fmt"
	"net"
	"net/url"
	"os"
	"path/filepath"
	"strconv"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Cloud      string `yaml:"cloud"`       // e.g. https://erpaio.vercel.app
	Token      string `yaml:"token"`       // agent bearer token (erpaio_...)
	DBHost     string `yaml:"db_host"`
	DBPort     int    `yaml:"db_port"`
	DBName     string `yaml:"db_name"`
	DBUser     string `yaml:"db_user"`
	DBPassword string `yaml:"db_password"`
}

func dir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".erpaio-agent"), nil
}

// Path returns the config file location.
func Path() (string, error) {
	d, err := dir()
	if err != nil {
		return "", err
	}
	return filepath.Join(d, "config.yaml"), nil
}

// Save writes the config with owner-only permissions (it holds a DB password).
func (c *Config) Save() error {
	d, err := dir()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(d, 0o700); err != nil {
		return err
	}
	data, err := yaml.Marshal(c)
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(d, "config.yaml"), data, 0o600)
}

// Load reads the persisted config.
func Load() (*Config, error) {
	p, err := Path()
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(p)
	if err != nil {
		return nil, fmt.Errorf("read config (%s): %w — run `erpaio-agent register` first", p, err)
	}
	var c Config
	if err := yaml.Unmarshal(data, &c); err != nil {
		return nil, err
	}
	return &c, nil
}

// DSN builds the go-mssqldb connection string (credentials URL-escaped).
func (c *Config) DSN() string {
	q := url.Values{}
	q.Set("database", c.DBName)
	u := url.URL{
		Scheme:   "sqlserver",
		User:     url.UserPassword(c.DBUser, c.DBPassword),
		Host:     net.JoinHostPort(c.DBHost, strconv.Itoa(c.DBPort)),
		RawQuery: q.Encode(),
	}
	return u.String()
}
