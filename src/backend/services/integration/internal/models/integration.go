package models

import (
	"time"            // go1.21
	"encoding/json"   // go1.21
	"errors"          // go1.21
)

// Global errors representing various integration-related failures
var (
	// ErrNotImplemented indicates that a method is not yet implemented in the adapter.
	ErrNotImplemented = errors.New("method not implemented")

	// ErrInvalidPayload indicates that the provided payload for an integration operation is invalid.
	ErrInvalidPayload = errors.New("invalid integration payload")

	// ErrInitializationFailed indicates that the integration initialization process has failed.
	ErrInitializationFailed = errors.New("integration initialization failed")

	// ErrConnectionFailed indicates that a connection attempt to the external service has failed.
	ErrConnectionFailed = errors.New("integration connection failed")
)

// Integration defines the core contract that all external service adapters must fulfill.
// It ensures uniform interaction, error handling, and status reporting across different
// external integrations such as email systems, chat platforms, and project management tools.
type Integration interface {
	/*
	   Initialize prepares the integration with the given configuration details and sets
	   up all necessary connections.

	   Steps to be performed upon a real implementation:
	   1. Validate configuration parameters for completeness.
	   2. Check required credentials and endpoints for validity.
	   3. Set up secure connection(s) to the external service.
	   4. Initialize any required clients or dependent resources.
	   5. Perform a test request or ping to verify connectivity.
	   6. Establish the initial integration status (e.g., Connected = false if test fails).
	   7. Return a wrapped error via the errors package if any of the above steps fail.
	*/
	Initialize(config interface{}) error

	/*
	   Send forwards the specified payload to the external system, applying any required
	   validations and retries.

	   Steps to be performed upon a real implementation:
	   1. Validate the input payload structure and content.
	   2. Check the current connection status and handle reconnection if needed.
	   3. Transform or serialize data to match the target service's format.
	   4. Apply rate-limiting or throttling, if configured.
	   5. Send the payload to the external service with a defined timeout.
	   6. Analyze and handle the service response, ensuring success or capturing errors.
	   7. Update the last synchronization timestamp upon a successful send.
	   8. Return a wrapped error via the errors package if any step fails.
	*/
	Send(payload interface{}) error

	/*
	   Status retrieves the current health and operational metrics of the integration.

	   Steps to be performed upon a real implementation:
	   1. Check the connectivity health with the external service.
	   2. Gather performance metrics such as recent error rates.
	   3. Collect and aggregate error statistics for reporting.
	   4. Update or verify the connection state (Connected = true/false).
	   5. Include any configured rate-limit information or usage quotas.
	   6. Add any relevant custom metadata or contextual details.
	   7. Return a fully populated IntegrationStatus struct and a wrapped error if needed.
	*/
	Status() (IntegrationStatus, error)
}

// IntegrationStatus holds crucial information regarding the current state
// and diagnostic metrics of a given integration. It is designed to provide
// an at-a-glance overview of connection health, performance statistics,
// timestamps for key events, and arbitrary metadata.
type IntegrationStatus struct {
	// Connected indicates whether the integration is currently connected (true)
	// or if it is experiencing a disconnection or error state (false).
	Connected bool

	// Name is a human-readable identifier for the integration (e.g., "Slack",
	// "GitHub", "EmailService").
	Name string

	// Type specifies the category of the integration (e.g., "chat", "email",
	// "project_management") to differentiate adapter behaviors and requirements.
	Type string

	// LastSync represents the timestamp of the most recent successful data transfer
	// or operation with the external service.
	LastSync time.Time

	// LastError holds the timestamp of the most recent recorded error for the
	// integration. It defaults to the zero value of time.Time if no errors have occurred.
	LastError time.Time

	// ErrorCount tracks the number of errors encountered within a relevant timeframe
	// (e.g., since last successful sync or within a rolling window).
	ErrorCount int

	// SuccessRate provides a numeric measure representing the ratio of successful operations
	// to total attempted operations over a given interval. A value of 1.0 indicates a 100%
	// success rate, whereas 0.0 indicates consistent failure.
	SuccessRate float64

	// Metadata houses any custom properties, key-value pairs, or additional diagnostic information
	// relevant to the integration's state, usage statistics, or environment.
	Metadata map[string]interface{}
}

// MarshalJSON implements a custom JSON serialization to ensure that time fields
// and other metrics are formatted consistently and clearly. This helps maintain
// ISO8601 standard for timestamps and provides a structure conducive to logging
// and monitoring tools.
func (i IntegrationStatus) MarshalJSON() ([]byte, error) {
	// Create an alias struct to define how we want to output and format the JSON.
	type statusAlias struct {
		Connected   bool                   `json:"connected"`
		Name        string                 `json:"name"`
		Type        string                 `json:"type"`
		LastSync    string                 `json:"lastSync"`
		LastError   string                 `json:"lastError"`
		ErrorCount  int                    `json:"errorCount"`
		SuccessRate float64                `json:"successRate"`
		Metadata    map[string]interface{} `json:"metadata"`
	}

	// Convert timestamps to a standardized RFC3339 format (ISO8601).
	aliasValue := statusAlias{
		Connected:   i.Connected,
		Name:        i.Name,
		Type:        i.Type,
		LastSync:    i.LastSync.Format(time.RFC3339),
		LastError:   i.LastError.Format(time.RFC3339),
		ErrorCount:  i.ErrorCount,
		SuccessRate: i.SuccessRate,
		Metadata:    i.Metadata,
	}

	// Marshal the aliased struct to produce the final JSON representation.
	return json.Marshal(aliasValue)
}