// Package feed is an in-memory pub/sub hub for live console events.
// Subscribers are typically SSE connections.
package feed

import (
	"context"
	"log/slog"
	"math/rand"
	"sync"
	"time"

	"github.com/voiceguardian/backend/internal/store"
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

/* -------------------------------------------------------------------------- */
/*  Simulator                                                                  */
/* -------------------------------------------------------------------------- */

var (
	verbs = []string{"INTERCEPT", "ANALYZE", "VOICEPRINT", "ROUTE", "BLOCK", "FLAG", "TRACE", "ESCALATE"}

	prefixes = []string{"+86-138", "+86-186", "+855-23", "+95-9", "+856-21",
		"+84-28", "+90-553", "+62-21", "+91-90", "+960-7"}

	origins = []string{"MM/YGN", "KH/PNH", "LA/VTE", "VN/SGN", "TH/BKK",
		"PH/MNL", "MY/KUL", "NG/LAG", "IN/BOM", "AE/DXB"}

	scriptHits = []string{
		"URGENCY · 今天必须办",
		"TRANSFER · 安全账户",
		"ISOLATE · 不能告诉家人",
		"CREDS · 验证码 / 卡号",
		"AUTHORITY · 公检法",
		"RELATIVE · 克隆孙子",
		"DEEPFAKE · 实时换声",
	}
)

func phone(rng *rand.Rand) string {
	return prefixes[rng.Intn(len(prefixes))] +
		"-" + zeroPad(rng.Intn(900)+100, 3) +
		"-" + zeroPad(rng.Intn(9000)+1000, 4)
}

func zeroPad(n, width int) string {
	s := []byte{}
	str := []byte{}
	for n > 0 {
		str = append([]byte{byte('0' + n%10)}, str...)
		n /= 10
	}
	for i := len(str); i < width; i++ {
		s = append(s, '0')
	}
	return string(append(s, str...))
}

// Simulate emits realistic events at random intervals.
// It also increments store counters so REST /stats reflects the same flux.
func Simulate(ctx context.Context, h *Hub, st *store.Store, log *slog.Logger) {
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	idCounter := int64(0)

	for {
		// 700–1300 ms between events.
		wait := time.Duration(700+rng.Intn(600)) * time.Millisecond
		select {
		case <-ctx.Done():
			return
		case <-time.After(wait):
		}

		verb := verbs[rng.Intn(len(verbs))]
		payload, level, side := makePayload(verb, rng)

		idCounter++
		ev := Event{
			ID:        time.Now().Format("20060102T150405.000") + "-" + zeroPad(int(idCounter%10000), 4),
			Timestamp: time.Now(),
			Side:      side,
			Verb:      verb,
			Payload:   payload,
			Level:     level,
		}
		h.Publish(ev)

		// Side-effect counters.
		switch verb {
		case "INTERCEPT", "TRACE", "ROUTE":
			st.IncIntercepted(int64(rng.Intn(4) + 1))
		case "BLOCK":
			st.IncBlocked(1)
			st.IncIntercepted(1)
		case "VOICEPRINT":
			if rng.Float64() < 0.4 {
				st.IncAIClones(1)
			}
		case "FLAG":
			st.IncScriptHits(1)
		}
	}
}

func makePayload(verb string, rng *rand.Rand) (string, string, string) {
	switch verb {
	case "INTERCEPT":
		return phone(rng), "info", "trace"
	case "ANALYZE":
		v := 85 + rng.Float64()*14
		return formatPct("match=", v), "info", "voice"
	case "VOICEPRINT":
		v := 60 + rng.Float64()*38
		level := "warn"
		if v > 88 {
			level = "danger"
		}
		return formatPct("synth=", v) + " / F0↓", level, "voice"
	case "ROUTE":
		return "actual_origin=" + origins[rng.Intn(len(origins))], "warn", "trace"
	case "BLOCK":
		return phone(rng) + " → KILL", "danger", "system"
	case "FLAG":
		return scriptHits[rng.Intn(len(scriptHits))], "warn", "script"
	case "TRACE":
		return "hops=" + zeroPad(rng.Intn(7)+2, 1) + " via VPN/PBX", "info", "trace"
	case "ESCALATE":
		return "→ DEFCON " + zeroPad(rng.Intn(2)+1, 1), "danger", "system"
	}
	return "", "info", "system"
}

func formatPct(prefix string, v float64) string {
	// 1 decimal place, e.g. "synth=92.4%".
	whole := int(v)
	frac := int((v - float64(whole)) * 10)
	if frac < 0 {
		frac = -frac
	}
	return prefix +
		zeroPad(whole, 1) + "." + zeroPad(frac, 1) + "%"
}
