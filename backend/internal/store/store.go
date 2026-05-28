// Package store keeps in-memory counters consumed by the dashboard.
package store

import (
	"sync"
	"sync/atomic"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Counters is the global aggregated state.
type Counters struct {
	InterceptedCalls atomic.Int64
	BlockedCalls     atomic.Int64
	AICloneDetected  atomic.Int64
	ScriptHits       atomic.Int64
	SmsBlocked       atomic.Int64
	FundsHeldYuan    atomic.Int64 // 元

	mu     sync.RWMutex
	defcon int
	since  time.Time
}

// New returns a store with zeroed counters. Counters now grow from real
// /api/v1/analyze traffic (publishVerdict in the api package); there is no
// synthetic baseline.
// pool is the PostgreSQL pool used for persistent data (currently emergency contacts only).
func New(pool *pgxpool.Pool) *Store {
	c := &Counters{}
	c.defcon = 2
	c.since = time.Now()

	return &Store{c: c, cb: newCredBag(), pool: pool}
}

// Store wraps Counters for external access.
type Store struct {
	c    *Counters
	cb   *credBag
	pool *pgxpool.Pool
}

// Snapshot is a JSON-friendly view of current counters.
type Snapshot struct {
	InterceptedCalls int64     `json:"interceptedCalls"`
	BlockedCalls     int64     `json:"blockedCalls"`
	AICloneDetected  int64     `json:"aiCloneDetected"`
	ScriptHits       int64     `json:"scriptHits"`
	SmsBlocked       int64     `json:"smsBlocked"`
	FundsHeldYuan    int64     `json:"fundsHeldYuan"`
	Defcon           int       `json:"defcon"`
	Since            time.Time `json:"since"`
	NowUTC           time.Time `json:"nowUtc"`
}

// Snapshot returns an immutable copy of the current numbers.
func (s *Store) Snapshot() Snapshot {
	s.c.mu.RLock()
	defcon, since := s.c.defcon, s.c.since
	s.c.mu.RUnlock()
	return Snapshot{
		InterceptedCalls: s.c.InterceptedCalls.Load(),
		BlockedCalls:     s.c.BlockedCalls.Load(),
		AICloneDetected:  s.c.AICloneDetected.Load(),
		ScriptHits:       s.c.ScriptHits.Load(),
		SmsBlocked:       s.c.SmsBlocked.Load(),
		FundsHeldYuan:    s.c.FundsHeldYuan.Load(),
		Defcon:           defcon,
		Since:            since,
		NowUTC:           time.Now().UTC(),
	}
}

// IncIntercepted records one more intercepted call.
func (s *Store) IncIntercepted(n int64)      { s.c.InterceptedCalls.Add(n) }
func (s *Store) IncBlocked(n int64)          { s.c.BlockedCalls.Add(n) }
func (s *Store) IncAIClones(n int64)         { s.c.AICloneDetected.Add(n) }
func (s *Store) IncScriptHits(n int64)       { s.c.ScriptHits.Add(n) }
func (s *Store) AddFundsHeld(yuan int64)     { s.c.FundsHeldYuan.Add(yuan) }

// Defcon returns / sets the current threat level (1 = highest, 5 = peace).
func (s *Store) Defcon() int {
	s.c.mu.RLock()
	defer s.c.mu.RUnlock()
	return s.c.defcon
}
func (s *Store) SetDefcon(level int) {
	if level < 1 || level > 5 {
		return
	}
	s.c.mu.Lock()
	s.c.defcon = level
	s.c.mu.Unlock()
}
