// Package feed is an in-memory pub/sub hub for live console events.
// Subscribers are typically SSE connections.
package feed

import (
	"log/slog"
	"sync"
	"time"
)

// Event is a single dashboard event.
//
// Level: "info" | "warn" | "danger"
// Side : "system" | "trace" | "voice" | "script"
type Event struct {
	ID        string    `json:"id"`
	Timestamp time.Time `json:"ts"`
	Side      string    `json:"side"`
	Verb      string    `json:"verb"`
	Payload   string    `json:"payload"`
	Level     string    `json:"level"`
}

// Hub fans out events to all subscribers.
type Hub struct {
	mu     sync.RWMutex
	subs   map[chan Event]struct{}
	recent []Event // ring of recent events (capped)
	cap    int

	log *slog.Logger
}

// NewHub creates a fan-out hub.
func NewHub(log *slog.Logger) *Hub {
	return &Hub{
		subs: make(map[chan Event]struct{}),
		cap:  128,
		log:  log,
	}
}

// Publish broadcasts an event to all subscribers and stores it in the ring.
func (h *Hub) Publish(ev Event) {
	h.mu.Lock()
	h.recent = append(h.recent, ev)
	if len(h.recent) > h.cap {
		h.recent = h.recent[len(h.recent)-h.cap:]
	}
	subs := make([]chan Event, 0, len(h.subs))
	for c := range h.subs {
		subs = append(subs, c)
	}
	h.mu.Unlock()

	for _, c := range subs {
		// non-blocking: drop slow subscribers.
		select {
		case c <- ev:
		default:
		}
	}
}

// Subscribe returns a channel + an unsubscribe func.
func (h *Hub) Subscribe() (<-chan Event, func()) {
	ch := make(chan Event, 32)
	h.mu.Lock()
	h.subs[ch] = struct{}{}
	h.mu.Unlock()

	return ch, func() {
		h.mu.Lock()
		delete(h.subs, ch)
		h.mu.Unlock()
		close(ch)
	}
}

// Recent returns the last `n` events (newest last).
func (h *Hub) Recent(n int) []Event {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if n <= 0 || n > len(h.recent) {
		n = len(h.recent)
	}
	out := make([]Event, n)
	copy(out, h.recent[len(h.recent)-n:])
	return out
}

// Stats reports lightweight hub counters used by ops monitoring.
type Stats struct {
	Subscribers int       `json:"subscribers"`
	Buffered    int       `json:"buffered"`
	LastEvent   time.Time `json:"lastEvent,omitempty"`
}

// Stats returns subscriber count, ring length, and timestamp of the last event.
func (h *Hub) Stats() Stats {
	h.mu.RLock()
	defer h.mu.RUnlock()
	out := Stats{
		Subscribers: len(h.subs),
		Buffered:    len(h.recent),
	}
	if n := len(h.recent); n > 0 {
		out.LastEvent = h.recent[n-1].Timestamp
	}
	return out
}
