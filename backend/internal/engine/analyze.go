// Package engine bundles the three analysis layers
// (trace, voiceprint, script-NLU) into a single Analyze call.
package engine

import (
	"context"
	"log/slog"
	"strings"
	"sync/atomic"
	"time"
)

// Engine orchestrates the three layers.
type Engine struct {
	log *slog.Logger

	analyzed     atomic.Int64
	failed       atomic.Int64
	lastAnalyzed atomic.Int64 // unix nano of last successful Analyze
	lastFailed   atomic.Int64 // unix nano of last failure
}

// New returns an engine ready to analyze incoming calls.
func New(log *slog.Logger) *Engine {
	return &Engine{log: log}
}

// Stats reports lightweight engine counters used by ops monitoring.
type Stats struct {
	Analyzed     int64     `json:"analyzed"`
	Failed       int64     `json:"failed"`
	LastAnalyzed time.Time `json:"lastAnalyzed,omitempty"`
	LastFailed   time.Time `json:"lastFailed,omitempty"`
}

// Stats returns a snapshot of engine counters.
func (e *Engine) Stats() Stats {
	out := Stats{
		Analyzed: e.analyzed.Load(),
		Failed:   e.failed.Load(),
	}
	if ns := e.lastAnalyzed.Load(); ns > 0 {
		out.LastAnalyzed = time.Unix(0, ns)
	}
	if ns := e.lastFailed.Load(); ns > 0 {
		out.LastFailed = time.Unix(0, ns)
	}
	return out
}

// Request describes an incoming call to analyze.
type Request struct {
	CallID         string  `json:"callId"`
	ShownNumber    string  `json:"shownNumber"`
	SignalOriginCC string  `json:"signalOriginCC"` // ISO 3166-1 alpha-2
	AudioSeconds   float64 `json:"audioSeconds"`
	TranscriptHint string  `json:"transcriptHint"` // optional snippet
}

// Verdict is the unified output across all three layers.
type Verdict struct {
	CallID    string    `json:"callId"`
	Timestamp time.Time `json:"ts"`

	Trace      TraceVerdict      `json:"trace"`
	Voiceprint VoiceprintVerdict `json:"voiceprint"`
	Script     ScriptVerdict     `json:"script"`

	RiskScore     int    `json:"riskScore"`     // 0–100
	RiskLevel     string `json:"riskLevel"`     // SAFE / WATCH / ALERT / BLOCK
	Action        string `json:"action"`        // pass / alert / block
	LatencyMillis int64  `json:"latencyMillis"`
}

// Analyze runs all three layers concurrently and merges results.
func (e *Engine) Analyze(ctx context.Context, req Request) (Verdict, error) {
	start := time.Now()

	type tRes struct{ v TraceVerdict; err error }
	type vRes struct{ v VoiceprintVerdict; err error }
	type sRes struct{ v ScriptVerdict; err error }

	tc := make(chan tRes, 1)
	vc := make(chan vRes, 1)
	sc := make(chan sRes, 1)

	go func() {
		v, err := AnalyzeTrace(ctx, req.ShownNumber, req.SignalOriginCC)
		tc <- tRes{v, err}
	}()
	go func() {
		v, err := AnalyzeVoiceprint(ctx, req.AudioSeconds)
		vc <- vRes{v, err}
	}()
	go func() {
		v, err := AnalyzeScript(ctx, req.TranscriptHint)
		sc <- sRes{v, err}
	}()

	t, v, s := <-tc, <-vc, <-sc
	if t.err != nil {
		e.failed.Add(1)
		e.lastFailed.Store(time.Now().UnixNano())
		return Verdict{}, t.err
	}
	if v.err != nil {
		e.failed.Add(1)
		e.lastFailed.Store(time.Now().UnixNano())
		return Verdict{}, v.err
	}
	if s.err != nil {
		e.failed.Add(1)
		e.lastFailed.Store(time.Now().UnixNano())
		return Verdict{}, s.err
	}

	risk := mergeRisk(t.v.Risk, v.v.Risk, s.v.Risk)
	level, action := classify(risk)

	e.analyzed.Add(1)
	e.lastAnalyzed.Store(time.Now().UnixNano())

	return Verdict{
		CallID:        req.CallID,
		Timestamp:     time.Now(),
		Trace:         t.v,
		Voiceprint:    v.v,
		Script:        s.v,
		RiskScore:     risk,
		RiskLevel:     level,
		Action:        action,
		LatencyMillis: time.Since(start).Milliseconds(),
	}, nil
}

// mergeRisk takes the (probabilistically) worst of the three signals while
// rewarding multi-layer corroboration.
func mergeRisk(a, b, c int) int {
	// pick the two largest then average — a single noisy layer can't flip the verdict alone.
	hi1, hi2 := a, b
	if c > hi1 {
		hi1, hi2 = c, hi1
	} else if c > hi2 {
		hi2 = c
	}
	if hi2 > hi1 {
		hi1, hi2 = hi2, hi1
	}
	merged := (hi1*7 + hi2*3) / 10
	if merged > 100 {
		merged = 100
	}
	if merged < 0 {
		merged = 0
	}
	return merged
}

func classify(risk int) (level, action string) {
	switch {
	case risk >= 85:
		return "BLOCK", "block"
	case risk >= 65:
		return "ALERT", "alert"
	case risk >= 35:
		return "WATCH", "alert"
	default:
		return "SAFE", "pass"
	}
}

// trim spaces and lowercase for tolerant matching.
func norm(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}
