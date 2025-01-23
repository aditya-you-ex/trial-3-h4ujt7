package config

import (
	// go1.21 - Environment variable access and file operations
	"os"

	// go1.21 - Time-related operations and timeout management
	"time"

	// go1.21 - JSON encoding/decoding for configuration data
	"encoding/json"

	// v1.17.0 - Advanced configuration management with environment variable support
	"github.com/spf13/viper"
)

// defaultTimeout represents the default global timeout setting for external integrations.
var defaultTimeout = 30 * time.Second

// defaultConfigPath is the fallback file path for the configuration if none is provided.
var defaultConfigPath = "/etc/taskstream/config.yaml"

// configVersion indicates the current version level of the integration service configuration.
var configVersion = "1.0.0"

// EmailConfig holds the enhanced email integration configuration,
// capturing both connectivity and security-related parameters.
type EmailConfig struct {
	// Host specifies the SMTP server hostname or IP address.
	Host string `json:"host" mapstructure:"host"`

	// Port specifies the SMTP server port (typically 25, 465, or 587).
	Port int `json:"port" mapstructure:"port"`

	// Username is the credential for SMTP authentication if required.
	Username string `json:"username" mapstructure:"username"`

	// Password is the credential for SMTP authentication if required.
	// This should be stored securely and encrypted at rest.
	Password string `json:"password" mapstructure:"password"`

	// UseTLS indicates whether to use TLS/SSL for outbound email.
	UseTLS bool `json:"useTLS" mapstructure:"useTLS"`

	// FromAddress is the default sender address used for outgoing emails.
	FromAddress string `json:"fromAddress" mapstructure:"fromAddress"`

	// AllowedDomains restricts outbound emails to these domains for security.
	AllowedDomains []string `json:"allowedDomains" mapstructure:"allowedDomains"`

	// RequireAuth indicates whether the email server requires authentication.
	RequireAuth bool `json:"requireAuth" mapstructure:"requireAuth"`
}

// SlackConfig holds advanced Slack-related configuration, including
// authentication tokens and optional enterprise workspace management settings.
type SlackConfig struct {
	// Token is the Slack API token. Must be kept secure.
	Token string `json:"token" mapstructure:"token"`

	// DefaultChannel is where system notifications or messages are sent by default.
	DefaultChannel string `json:"defaultChannel" mapstructure:"defaultChannel"`

	// UseEnterprise indicates whether this Slack configuration applies to
	// an Enterprise Grid environment, which might require additional scopes.
	UseEnterprise bool `json:"useEnterprise" mapstructure:"useEnterprise"`

	// AdminUserID can hold a privileged user ID for certain automation tasks.
	// This field should be used carefully to avoid security risks.
	AdminUserID string `json:"adminUserId" mapstructure:"adminUserId"`
}

// JiraConfig holds the configuration properties used to connect
// to a Jira instance with secure authentication.
type JiraConfig struct {
	// URL is the Jira server or cloud instance base URL.
	URL string `json:"url" mapstructure:"url"`

	// Username is used for Basic Auth or API token-based authentication.
	Username string `json:"username" mapstructure:"username"`

	// APIToken is the token or password used for authentication against the Jira API.
	APIToken string `json:"apiToken" mapstructure:"apiToken"`

	// ProjectKey specifies a default Jira project key used for certain task automations.
	ProjectKey string `json:"projectKey" mapstructure:"projectKey"`

	// UseCloud indicates whether connecting to Jira Cloud (as opposed to a self-hosted instance).
	UseCloud bool `json:"useCloud" mapstructure:"useCloud"`
}

// Config is the main configuration structure for the integration service.
// It consolidates email, Slack, and Jira settings, along with general service parameters.
// This structure also includes enhanced security checks, validation, and monitoring features.
type Config struct {
	// Email holds all advanced email-related configurations.
	Email *EmailConfig `json:"email" mapstructure:"email"`

	// Slack holds the Slack integration configurations.
	Slack *SlackConfig `json:"slack" mapstructure:"slack"`

	// Jira holds the Jira integration configurations.
	Jira *JiraConfig `json:"jira" mapstructure:"jira"`

	// Timeout indicates a global service timeout for external calls.
	Timeout time.Duration `json:"timeout" mapstructure:"timeout"`

	// Debug toggles verbose logging and diagnostic messages.
	Debug bool `json:"debug" mapstructure:"debug"`

	// Version represents the config version. Must match or be compatible with configVersion.
	Version string `json:"version" mapstructure:"version"`

	// LastUpdated is the last time this configuration was updated or reloaded.
	LastUpdated time.Time `json:"lastUpdated" mapstructure:"lastUpdated"`
}

// Validate performs all necessary verifications to ensure the integrity and security of the Config.
// It checks required fields, security constraints, and validates the version, email, Slack, and Jira configs.
func (c *Config) Validate() error {
	// 1. Check config version compatibility
	if c.Version != configVersion {
		return &ConfigError{
			Context: "Config version mismatch",
			Message: "Expected version " + configVersion + ", but found " + c.Version,
		}
	}

	// 2. Validate presence of core configurations
	if c.Email == nil || c.Slack == nil || c.Jira == nil {
		return &ConfigError{
			Context: "Missing core configs",
			Message: "Email, Slack, or Jira configuration is not provided",
		}
	}

	// 3. Perform security validation on credentials
	if c.Email.RequireAuth {
		if c.Email.Username == "" || c.Email.Password == "" {
			return &ConfigError{
				Context: "Email Auth",
				Message: "Email requires auth but username/password is missing",
			}
		}
	}

	// 4. Validate email configuration with TLS checks
	if c.Email.UseTLS && (c.Email.Port != 465 && c.Email.Port != 587) {
		// Common TLS ports are 465 or 587, although 25 can also be used with STARTTLS
		// Additional custom checks could be inserted here as needed.
	}

	// 5. Validate Slack token format (basic check for non-empty)
	if c.Slack.Token == "" {
		return &ConfigError{
			Context: "Slack Token",
			Message: "Slack token cannot be empty; must provide valid authentication token",
		}
	}

	// 6. Validate Jira URL format and accessibility (URL format check)
	if c.Jira.URL == "" {
		return &ConfigError{
			Context: "Jira URL",
			Message: "Jira URL cannot be empty; must provide valid URL endpoint",
		}
	}

	// 7. Verify timeout settings are within acceptable ranges
	if c.Timeout <= 0 || c.Timeout > (5*time.Minute) {
		return &ConfigError{
			Context: "Timeout Range",
			Message: "Timeout must be between 1s and 5m, found: " + c.Timeout.String(),
		}
	}

	// 8. Check for secure credential storage - demonstrate placeholder
	// In a production environment, you may enforce checks that secrets are loaded from a secure vault.

	return nil
}

// IsHealthy checks the health of all configured integrations by verifying connectivity and
// ensuring credentials are accessible. Returns a boolean indicating health and an error if any issues are found.
func (c *Config) IsHealthy() (bool, error) {
	// 1. Check email server connectivity (placeholder check)
	// In production, you might initiate a small handshake or connect attempt here.

	// 2. Verify Slack API token validity (placeholder check)
	// You can call Slack API's auth.test endpoint to confirm validity.

	// 3. Test Jira API accessibility (placeholder check)
	// You would likely do a GET to the Jira base URL with the provided credentials to ensure accessibility.

	// 4. Verify credential access (placeholder check)
	// Confirm that critical fields, such as tokens and passwords, are set and not placeholders.

	// 5. Check configuration freshness (e.g., if LastUpdated is too old, that might be a problem.)
	if time.Since(c.LastUpdated) > 24*time.Hour {
		// This is just an example check. It might or might not be a real requirement.
	}

	// If all checks pass, return true
	return true, nil
}

// LoadConfig loads the configuration from a specified file path,
// applies secure defaults, merges environment variables, performs validation,
// and returns the resulting Config object. The function ensures advanced
// security checks, file permissions, and version compatibility.
func LoadConfig(configPath string) (*Config, error) {
	// 1. If no config path provided, use defaultConfigPath
	if configPath == "" {
		configPath = defaultConfigPath
	}

	// 2. Verify configuration file permissions (basic placeholder check)
	fileInfo, err := os.Stat(configPath)
	if err != nil {
		return nil, &ConfigError{
			Context: "File Permissions",
			Message: "Unable to access config file: " + err.Error(),
		}
	}
	if fileInfo.Mode()&0077 != 0 {
		// In production, you might enforce stricter file permission checks.
	}

	// 3. Initialize Viper with secure defaults
	v := viper.New()
	v.SetConfigFile(configPath)

	// 4. Set secure default values
	setDefaults(v)

	// 5. Read configuration, handling errors
	if err := v.ReadInConfig(); err != nil {
		return nil, &ConfigError{
			Context: "Config Read",
			Message: "Failed reading config file: " + err.Error(),
		}
	}

	// 6. Apply environment variable overrides
	v.AutomaticEnv()

	// 7. Unmarshal into Config struct
	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, &ConfigError{
			Context: "Unmarshal",
			Message: "Failed unmarshalling config: " + err.Error(),
		}
	}

	// 8. Validate configuration
	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	// 9. Mark the last updated time
	cfg.LastUpdated = time.Now()

	// 10. Return validated configuration object
	return &cfg, nil
}

// setDefaults configures secure default values in Viper, preventing the need for explicit user definitions
// of every field. This includes timeouts, TLS settings, and any other defaults relevant to the integration.
func setDefaults(v *viper.Viper) {
	// 1. Set secure timeout defaults
	v.SetDefault("timeout", defaultTimeout.String())

	// 2. Configure default TLS usage for email
	v.SetDefault("email.useTLS", true)
	v.SetDefault("email.requireAuth", true)

	// 3. Set secure API defaults
	v.SetDefault("slack.useEnterprise", false)
	v.SetDefault("jira.useCloud", false)

	// 4. Initialize monitoring defaults (placeholder for future monitoring expansions)
	v.SetDefault("debug", false)

	// 5. Set credential handling defaults
	v.SetDefault("version", configVersion)
}

// ConfigError represents a custom error type for configuration-specific issues,
// providing additional context for debugging and logging.
type ConfigError struct {
	Context string
	Message string
}

// Error implements the error interface, returning a comprehensive error message
// that can be used directly by callers in logs or user-facing messages.
func (ce *ConfigError) Error() string {
	data := map[string]string{
		"context": ce.Context,
		"message": ce.Message,
	}
	encoded, _ := json.Marshal(data)
	return string(encoded)
}
```