package adapters

import (
	// go1.21 - Provides context for cancellation, timeouts, and deadlines.
	"context"
	// go1.21 - Offers JSON parsing capabilities for structured data interchange.
	"encoding/json"
	// go1.21 - Facilitates formatted, structured error output and string composition.
	"fmt"
	// go1.21 - Supplies lightweight logging for runtime events and diagnostics.
	"log"
	// go1.21 - Offers concurrency-safe primitives like mutexes and RWMutex for threading.
	"sync"
	// go1.21 - Enables working with durations, timeouts, and rate-based logic.
	"time"

	// v1.16.0 - Official Jira REST API library for issue creation, retrieval, and updates.
	jira "github.com/andygrunwald/go-jira"
	// v0.1.0 - Provides token bucket–based rate limiting for API calls.
	"golang.org/x/time/rate"
	// v1.0.0 - OpenTelemetry library for tracing and observability insights.
	"go.opentelemetry.io/otel"

	// Named import from internal config package for JiraConfig struct and advanced config handling.
	"src/backend/services/integration/internal/config"
	// Named import from internal models package for Integration interface and IntegrationStatus struct.
	"src/backend/services/integration/internal/models"
)

// defaultIssueType represents the standard Jira issue type used if none is specified in the payload.
var defaultIssueType = "Task"

// defaultPriority represents the default priority assigned to newly created issues when unspecified.
var defaultPriority = "Medium"

// maxRetries sets the total number of retry attempts for API operations that fail due to transient errors.
var maxRetries = 3

// retryBackoff defines the wait duration between each retry attempt when calling Jira.
var retryBackoff = 2 * time.Second

// defaultTimeout stipulates the maximum duration for any single Jira API operation.
var defaultTimeout = 30 * time.Second

// CircuitBreaker serves as a simplistic placeholder demonstrating how circuit-breaking logic might be managed.
// In a production system, consider using a robust library or more elaborate logic for half-open states, failure
// thresholds, and reset timers.
type CircuitBreaker struct {
	mu         sync.Mutex
	open       bool
	failCount  int
	threshold  int
	resetTimer time.Duration
}

// Allow checks whether the circuit is open or allows an operation to proceed.
func (cb *CircuitBreaker) Allow() bool {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	// If circuit is open, do not allow further calls until reset occurs (simplified logic here).
	return !cb.open
}

// OnSuccess resets the failCount and potentially closes the circuit if it was open.
func (cb *CircuitBreaker) OnSuccess() {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	cb.failCount = 0
	cb.open = false
}

// OnFailure increments the failCount and opens the circuit if the threshold is reached.
func (cb *CircuitBreaker) OnFailure() {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	cb.failCount++
	if cb.failCount >= cb.threshold {
		cb.open = true
	}
}

// metricsCollector is a placeholder for enterprise-grade metrics recording and aggregation.
type metricsCollector struct {
	mu           sync.Mutex
	totalCalls   int
	failedCalls  int
	lastError    time.Time
	lastSuccess  time.Time
}

// RecordSuccess notes a successful call event in the collector.
func (mc *metricsCollector) RecordSuccess() {
	mc.mu.Lock()
	defer mc.mu.Unlock()
	mc.totalCalls++
	mc.lastSuccess = time.Now()
}

// RecordFailure notes a failed call event in the collector.
func (mc *metricsCollector) RecordFailure() {
	mc.mu.Lock()
	defer mc.mu.Unlock()
	mc.totalCalls++
	mc.failedCalls++
	mc.lastError = time.Now()
}

// ErrorCount returns the total number of failed calls recorded within this collector.
func (mc *metricsCollector) ErrorCount() int {
	mc.mu.Lock()
	defer mc.mu.Unlock()
	return mc.failedCalls
}

// SuccessRate computes the ratio of successful calls to total calls. Returns 1.0 if no calls have been made yet.
func (mc *metricsCollector) SuccessRate() float64 {
	mc.mu.Lock()
	defer mc.mu.Unlock()
	if mc.totalCalls == 0 {
		return 1.0
	}
	successCalls := mc.totalCalls - mc.failedCalls
	return float64(successCalls) / float64(mc.totalCalls)
}

// JiraAdapter is a thread-safe implementation of the Integration interface specifically for Jira.
// It integrates advanced error handling, concurrency, circuit breaker patterns, and rate limiting.
type JiraAdapter struct {
	// client is the underlying Jira client used for performing operations.
	client *jira.Client
	// config holds secure credentials and preferences for Jira connectivity.
	config *config.JiraConfig
	// lastSync captures the timestamp of the last successful synchronization or data push.
	lastSync time.Time
	// connected indicates whether the JiraAdapter believes it has a healthy, established connection.
	connected bool
	// mu ensures thread-safe read/write operations on shared fields.
	mu *sync.RWMutex
	// rateLimiter applies token-bucket based control to limit calls to Jira.
	rateLimiter *rate.Limiter
	// circuitBreaker helps prevent repeated calls when Jira is consistently failing or unreachable.
	circuitBreaker *CircuitBreaker
	// metrics gathers essential operational data such as error counts and success rates.
	metrics *metricsCollector
}

// NewJiraAdapter is the constructor that creates a new JiraAdapter with enterprise-level concurrency,
// rate limiting, circuit breaker, and telemetry capabilities.
func NewJiraAdapter(cfg *config.JiraConfig) *JiraAdapter {
	// Initialize circuit breaker with a simple threshold; more advanced logic can be used in production.
	cb := &CircuitBreaker{
		open:       false,
		failCount:  0,
		threshold:  5,
		resetTimer: time.Minute, // Not fully utilized in this minimal example.
	}
	// Create a robust metrics collector.
	mc := &metricsCollector{
		totalCalls:   0,
		failedCalls:  0,
		lastError:    time.Time{},
		lastSuccess:  time.Time{},
	}

	// Initialize the adapter with a safe concurrency lock.
	adapter := &JiraAdapter{
		config:         cfg,
		lastSync:       time.Time{},
		connected:      false,
		mu:             &sync.RWMutex{},
		rateLimiter:    rate.NewLimiter(rate.Every(time.Second), 3),
		circuitBreaker: cb,
		metrics:        mc,
	}
	return adapter
}

// InitializeWithContext provides the actual logic for establishing the Jira client, validating
// connectivity, configuring advanced features, and marking connection status. This method can
// be invoked externally via Initialize if no custom context is provided.
func (ja *JiraAdapter) InitializeWithContext(ctx context.Context, cfg interface{}) error {
	ctx, span := otel.Tracer("integration.jira").Start(ctx, "JiraAdapter.Initialize")
	defer span.End()

	ja.mu.Lock()
	defer ja.mu.Unlock()

	// 1. Type Assert and Validate the Provided Configuration
	c, ok := cfg.(*config.JiraConfig)
	if !ok || c == nil {
		return models.ErrInvalidPayload
	}
	ja.config = c

	// 2. Create Jira Client with Basic Auth Transport
	transport := jira.BasicAuthTransport{
		Username: c.Username,
		Password: c.APIToken,
	}
	client, err := jira.NewClient(transport.Client(), c.URL)
	if err != nil {
		ja.connected = false
		return fmt.Errorf("failed to create Jira client: %w", err)
	}

	ja.client = client

	// 3. Test Connection with Retry Logic
	connected := false
	for i := 0; i < maxRetries; i++ {
		if ctx.Err() != nil {
			ja.connected = false
			return fmt.Errorf("context canceled or timed out: %w", ctx.Err())
		}

		err = ja.testConnection(ctx)
		if err == nil {
			connected = true
			break
		}

		time.Sleep(retryBackoff)
	}
	ja.connected = connected
	if !ja.connected {
		return fmt.Errorf("could not connect to Jira after %d attempts: %w", maxRetries, err)
	}

	// 4. Re-initialize Rate Limiter or CircuitBreaker if needed
	// (For demonstration, we can re-init them with default or config-based values)
	ja.rateLimiter = rate.NewLimiter(rate.Every(time.Second), 3)
	ja.circuitBreaker.failCount = 0
	ja.circuitBreaker.open = false

	// 5. Update Last Sync if connected
	if ja.connected {
		ja.lastSync = time.Now()
	}

	return nil
}

// Initialize implements the Integration interface, bridging to InitializeWithContext
// by providing a background context for operations when no custom context is supplied.
func (ja *JiraAdapter) Initialize(cfg interface{}) error {
	return ja.InitializeWithContext(context.Background(), cfg)
}

// SendWithContext forwards task or issue data to Jira under concurrency restrictions,
// leveraging the circuit breaker and applying rate limiting. It attempts retries on transient
// failures and updates operational metrics accordingly.
func (ja *JiraAdapter) SendWithContext(ctx context.Context, payload interface{}) error {
	ctx, span := otel.Tracer("integration.jira").Start(ctx, "JiraAdapter.Send")
	defer span.End()

	// 1. Check Circuit Breaker
	if !ja.circuitBreaker.Allow() {
		ja.metrics.RecordFailure()
		return fmt.Errorf("circuit breaker open, refusing to send request to Jira")
	}

	// 2. Apply Rate Limiting
	err := ja.rateLimiter.Wait(ctx, 1)
	if err != nil {
		ja.metrics.RecordFailure()
		ja.circuitBreaker.OnFailure()
		return fmt.Errorf("rate limiter prevented request: %w", err)
	}

	// 3. Validate Payload Structure
	data, ok := payload.(map[string]interface{})
	if !ok {
		ja.metrics.RecordFailure()
		ja.circuitBreaker.OnFailure()
		return models.ErrInvalidPayload
	}

	issueType := defaultIssueType
	if val, exists := data["issueType"]; exists {
		if t, castOk := val.(string); castOk && t != "" {
			issueType = t
		}
	}

	summary, hasSummary := data["summary"].(string)
	if !hasSummary || summary == "" {
		ja.metrics.RecordFailure()
		ja.circuitBreaker.OnFailure()
		return fmt.Errorf("missing required 'summary' field in payload")
	}

	description, _ := data["description"].(string)

	priority := defaultPriority
	if val, exists := data["priority"]; exists {
		if p, castOk := val.(string); castOk && p != "" {
			priority = p
		}
	}

	projectKey := ja.config.ProjectKey
	if val, exists := data["projectKey"]; exists {
		if pk, castOk := val.(string); castOk && pk != "" {
			projectKey = pk
		}
	}

	// 4. Construct Jira Issue
	newIssue := &jira.Issue{
		Fields: &jira.IssueFields{
			Type: jira.IssueType{
				Name: issueType,
			},
			Project: jira.Project{
				Key: projectKey,
			},
			Summary:     summary,
			Description: description,
			Priority: &jira.Priority{
				Name: priority,
			},
		},
	}

	// 5. Attempt Operation with Retry Logic
	var lastErr error
	for i := 0; i < maxRetries; i++ {
		if ctx.Err() != nil {
			ja.metrics.RecordFailure()
			ja.circuitBreaker.OnFailure()
			return fmt.Errorf("context canceled or timed out: %w", ctx.Err())
		}

		_, resp, createErr := ja.client.Issue.Create(newIssue)
		if createErr == nil && resp != nil && resp.StatusCode >= 200 && resp.StatusCode < 300 {
			ja.metrics.RecordSuccess()
			ja.circuitBreaker.OnSuccess()
			ja.updateLastSync()
			return nil
		}
		lastErr = createErr
		time.Sleep(retryBackoff)
	}

	// 6. Update Metrics on Failure
	ja.metrics.RecordFailure()
	ja.circuitBreaker.OnFailure()
	return fmt.Errorf("failed to create Jira issue after %d attempts: %w", maxRetries, lastErr)
}

// Send implements the Integration interface, bridging to SendWithContext by using
// a background context when no custom context is supplied.
func (ja *JiraAdapter) Send(payload interface{}) error {
	return ja.SendWithContext(context.Background(), payload)
}

// StatusWithContext collects runtime metrics and returns a comprehensive IntegrationStatus structure
// describing the Jira adapter's health, connectivity, and operational statistics.
func (ja *JiraAdapter) StatusWithContext(ctx context.Context) (models.IntegrationStatus, error) {
	_, span := otel.Tracer("integration.jira").Start(ctx, "JiraAdapter.Status")
	defer span.End()

	ja.mu.RLock()
	defer ja.mu.RUnlock()

	status := models.IntegrationStatus{
		Connected:   ja.connected,
		Name:        "JiraIntegration",
		Type:        "project_management",
		LastSync:    ja.lastSync,
		LastError:   ja.metrics.lastError,
		ErrorCount:  ja.metrics.ErrorCount(),
		SuccessRate: ja.metrics.SuccessRate(),
		Metadata: map[string]interface{}{
			"circuitBreakerOpen": ja.circuitBreaker.open,
			"failCount":          ja.circuitBreaker.failCount,
			"rateLimiterBurst":   ja.rateLimiter.Burst(),
			"rateLimiterLimit":   ja.rateLimiter.Limit(),
			"username":           ja.config.Username,
			"useCloud":           ja.config.UseCloud,
		},
	}
	return status, nil
}

// Status implements the Integration interface, bridging to StatusWithContext by using
// a background context when no custom context is supplied.
func (ja *JiraAdapter) Status() (models.IntegrationStatus, error) {
	return ja.StatusWithContext(context.Background())
}

// testConnection performs a simple Jira user lookup to confirm valid credentials and connectivity.
func (ja *JiraAdapter) testConnection(ctx context.Context) error {
	user, resp, err := ja.client.User.GetSelf()
	if err != nil {
		return fmt.Errorf("jira connection test failed: %w", err)
	}
	if resp == nil || resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("jira connection test returned invalid status: %v", resp)
	}
	log.Printf("Jira connection test succeeded for user: %v", user.DisplayName)
	return nil
}

// updateLastSync is a concurrency-safe way to record a successful synchronization timestamp.
func (ja *JiraAdapter) updateLastSync() {
	ja.mu.Lock()
	defer ja.mu.Unlock()
	ja.lastSync = time.Now()
}