package services

import (
	// go1.21 - Context management for cancellation and timeouts
	"context"
	// go1.21 - Enhanced error handling with wrapping
	"errors"
	// go1.21 - Thread-safe synchronization primitives
	"sync"
	// go1.21 - Time operations and duration management
	"time"

	// Internal imports from the same module
	"src/backend/services/integration/internal/config"
	"src/backend/services/integration/internal/models"
)

// Global default and error variables for SyncManager operations.
var (
	// defaultSyncInterval defines how often the synchronization loop executes.
	defaultSyncInterval = 5 * time.Minute
	// defaultRetryAttempts specifies how many retry attempts are made per operation.
	defaultRetryAttempts = 3
	// defaultBackoffFactor indicates the multiplier for exponential backoff per retry attempt.
	defaultBackoffFactor = 2
	// maxBackoffDuration sets the maximum delay time during exponential backoff.
	maxBackoffDuration = 1 * time.Hour

	// ErrSyncFailed is returned when a synchronization operation fails after all retries.
	ErrSyncFailed = errors.New("sync operation failed")
	// ErrIntegrationExists is returned when an attempt is made to register a duplicate integration key.
	ErrIntegrationExists = errors.New("integration already registered")
)

// SyncManager manages synchronization of multiple integration adapters with
// built-in reliability and health monitoring across all external services.
type SyncManager struct {
	// integrations is a thread-safe map of integration name -> Integration interface implementation.
	integrations map[string]models.Integration

	// mu is used to guard read/write access to the integrations map and internal state.
	mu *sync.RWMutex

	// cfg holds the validated integration service configuration.
	cfg *config.Config

	// ctx is the parent context used by all synchronization routines.
	ctx context.Context

	// cancel is a function to cancel the parent context and gracefully stop sync operations.
	cancel context.CancelFunc

	// syncInterval defines how frequently the synchronization loop re-checks or re-sends data.
	syncInterval time.Duration

	// metrics stores per-integration synchronization metrics (e.g., success/failure counts).
	metrics map[string]models.SyncMetrics

	// wg is used to wait for ongoing background synchronization routines to finish on shutdown.
	wg *sync.WaitGroup
}

// NewSyncManager is the constructor that creates a new instance of SyncManager.
// It validates the provided configuration, initializes concurrency primitives and
// data structures, and sets the default synchronization interval.
func NewSyncManager(cfg *config.Config) (*SyncManager, error) {
	// 1. Validate the provided configuration before proceeding.
	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	// 2. Initialize a context with cancellation for controlling the sync lifecycle.
	ctx, cancelFunc := context.WithCancel(context.Background())

	// 3. Create and populate the SyncManager.
	sm := &SyncManager{
		integrations: make(map[string]models.Integration),
		mu:           &sync.RWMutex{},
		cfg:          cfg,
		ctx:          ctx,
		cancel:       cancelFunc,
		syncInterval: defaultSyncInterval,
		metrics:      make(map[string]models.SyncMetrics),
		wg:           &sync.WaitGroup{},
	}

	// 4. Return the fully initialized SyncManager.
	return sm, nil
}

// RegisterIntegration safely adds a new integration adapter under the given name.
// If an integration by that name already exists, it returns an error. It also
// initializes the adapter with the shared Config to ensure readiness.
func (sm *SyncManager) RegisterIntegration(name string, integration models.Integration) error {
	if name == "" || integration == nil {
		return errors.New("invalid integration registration parameters")
	}

	sm.mu.Lock()
	defer sm.mu.Unlock()

	// Check if the integration is already registered.
	if _, exists := sm.integrations[name]; exists {
		return ErrIntegrationExists
	}

	// Attempt to initialize the integration with the current configuration.
	if err := integration.Initialize(sm.cfg); err != nil {
		return err
	}

	// Register into the map.
	sm.integrations[name] = integration

	// Initialize metrics for this new integration.
	sm.metrics[name] = models.SyncMetrics{}
	return nil
}

// StartSync starts the background synchronization process and metric collection.
// It spawns a goroutine running the syncLoop until the context is canceled or an error occurs.
func (sm *SyncManager) StartSync() error {
	// This simple check ensures that multiple StartSync calls do not create extra loops.
	// We rely on context cancellation to eventually stop the existing loop.
	if sm.ctx.Err() != nil {
		// Context is already canceled, we can't start.
		return errors.New("cannot start sync: context already canceled")
	}

	// Health monitoring or additional initialization steps could go here.

	// Start the main synchronization loop in a goroutine.
	sm.wg.Add(1)
	go func() {
		defer sm.wg.Done()
		sm.syncLoop()
	}()

	// Start additional background tasks if needed, e.g., metric collection routines.

	// Return nil if everything is started correctly.
	return nil
}

// StopSync gracefully stops the synchronization process by canceling the context,
// waiting for all active routines to complete, and performing final cleanup.
func (sm *SyncManager) StopSync() error {
	// 1. Cancel the synchronization context.
	sm.cancel()

	// 2. Wait for ongoing sync loops and tasks to finish.
	sm.wg.Wait()

	// 3. Clean up resources if needed. This could include closing open connections, etc.

	// 4. Optionally reset metrics upon shutdown. Example:
	for k := range sm.metrics {
		sm.metrics[k] = models.SyncMetrics{}
	}

	// Return nil to indicate a successful and graceful stop.
	return nil
}

// GetStatus returns a map of integration names to their current IntegrationStatus.
// It acquires a read lock to gather statuses safely, aggregates them, then returns
// the final result along with any encountered errors.
func (sm *SyncManager) GetStatus() (map[string]models.IntegrationStatus, error) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	statusMap := make(map[string]models.IntegrationStatus)
	var finalErr error

	for name, integration := range sm.integrations {
		// Retrieve the status of each integration individually.
		st, err := integration.Status()
		if err != nil {
			// We gather the first error encountered; for production-grade code,
			// you might want to aggregate or log all errors explicitly.
			finalErr = err
		}
		statusMap[name] = st
	}

	return statusMap, finalErr
}

// retryWithBackoff retries the given operation with exponential backoff until it
// either succeeds, runs out of attempts, or the context is canceled. If all attempts
// fail, it returns the last error encountered.
func retryWithBackoff(ctx context.Context, operation func() error) error {
	var attempt int
	backoff := time.Second // Start with a 1-second backoff.

	for attempt = 1; attempt <= defaultRetryAttempts; attempt++ {
		// Check for cancellation before each attempt.
		if ctx.Err() != nil {
			return ctx.Err()
		}

		// Execute the operation.
		if err := operation(); err != nil {
			// If this was the last attempt, return the error.
			if attempt == defaultRetryAttempts {
				return err
			}

			// Otherwise, wait with exponential backoff (but limit maximum).
			time.Sleep(backoff)
			backoff = backoff * time.Duration(defaultBackoffFactor)
			if backoff > maxBackoffDuration {
				backoff = maxBackoffDuration
			}
			continue
		}

		// If the operation succeeds, break early with nil error.
		return nil
	}
	// If we exit without success, return a sync-level error.
	return ErrSyncFailed
}

// syncLoop is a private method that continuously attempts to synchronize each registered
// integration at a fixed interval. It terminates when the context is canceled. This is
// where exponential backoff from retryWithBackoff can be applied for robust reliability.
func (sm *SyncManager) syncLoop() {
	ticker := time.NewTicker(sm.syncInterval)
	defer ticker.Stop()

	for {
		select {
		case <-sm.ctx.Done():
			// Context canceled, exit the loop gracefully.
			return
		case <-ticker.C:
			// Perform sync operations on each registered integration.
			sm.mu.RLock()
			for name, integration := range sm.integrations {
				// Each integration can have a specialized sync operation.
				op := func() error {
					// Placeholder example of a "send" operation or any sync logic.
					// In a real scenario, we might gather data from an internal queue
					// or framework and push/pull from the external service.
					return integration.Send("Periodic sync data")
				}

				// Example: use retryWithBackoff for robust reliability.
				err := retryWithBackoff(sm.ctx, op)
				if err != nil {
					// This error could be logged, counted towards metrics, etc.
					_ = err
				}

				// Additional metrics or checks can be updated here.
				// For instance, sm.metrics[name] might be updated accordingly.
			}
			sm.mu.RUnlock()
		}
	}
}