package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"runtime"
	"strconv"
	"time"

	"github.com/voiceguardian/backend/internal/engine"
	"github.com/voiceguardian/backend/internal/feed"
)

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

/* -------------------------------------------------------------------------- */
/*  Endpoints                                                                  */
/* -------------------------------------------------------------------------- */

func health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status":  "ok",
		"service": "voice-guardian",
		"version": "v2.6.1",
	})
}

func statsHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		writeEnvelope(w, http.StatusOK, d.Store.Snapshot())
	}
}

func defconGet(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		writeEnvelope(w, http.StatusOK, map[string]any{
			"level": d.Store.Defcon(),
		})
	}
}

func defconSet(d Deps) http.HandlerFunc {
	type req struct {
		Level int `json:"level"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		var body req
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json")
			return
		}
		if body.Level < 1 || body.Level > 5 {
			writeAPIError(w, http.StatusBadRequest, "VALIDATION_FAILED", "level must be 1..5")
			return
		}
		d.Store.SetDefcon(body.Level)
		writeEnvelope(w, http.StatusOK, map[string]any{"level": d.Store.Defcon()})
	}
}

func feedRecent(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		n := 32
		if q := r.URL.Query().Get("n"); q != "" {
			if v, err := strconv.Atoi(q); err == nil && v > 0 && v <= 256 {
				n = v
			}
		}
		writeEnvelope(w, http.StatusOK, d.Hub.Recent(n))
	}
}

func threatsActive(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		// Return latest danger-level events as "active threats".
		all := d.Hub.Recent(256)
		out := make([]any, 0, 16)
		for i := len(all) - 1; i >= 0 && len(out) < 16; i-- {
			if all[i].Level == "danger" {
				out = append(out, all[i])
			}
		}
		writeEnvelope(w, http.StatusOK, out)
	}
}

func analyzeCall(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req engine.Request
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json")
			return
		}
		if req.ShownNumber == "" {
			writeAPIError(w, http.StatusBadRequest, "VALIDATION_FAILED", "shownNumber required")
			return
		}

		verdict, err := d.Engine.Analyze(r.Context(), req)
		if err != nil {
			d.Logger.Error("analyze failed", "err", err, "callId", req.CallID)
			writeAPIError(w, http.StatusInternalServerError, "INTERNAL", "analysis failed")
			return
		}

		publishVerdict(d, req, verdict)
		writeEnvelope(w, http.StatusOK, verdict)
	}
}

// publishVerdict mirrors a successful Analyze into the SSE hub and bumps the
// real counters in store. The dashboard's Live Feed and Counters are driven
// off these side effects — there is no synthetic event source.
func publishVerdict(d Deps, req engine.Request, v engine.Verdict) {
	verb, side := classifyVerb(v)
	level := levelFromScore(v.RiskScore)

	scriptCategory := ""
	if len(v.Script.Hits) > 0 {
		scriptCategory = v.Script.Hits[0].Category
	}

	payload := map[string]any{
		"callId":       v.CallID,
		"shownNumber":  maskPhone(req.ShownNumber),
		"actualOrigin": v.Trace.ActualOrigin,
		"registry":     v.Trace.ShownRegistry,
		"mismatch":     v.Trace.Mismatch,
		"riskScore":    v.RiskScore,
		"riskLevel":    v.RiskLevel,
		"action":       v.Action,
		"verdict":      v.Voiceprint.Verdict,
		"synthProb":    v.Voiceprint.SynthProbability,
	}
	if scriptCategory != "" {
		payload["scriptCategory"] = scriptCategory
	}
	b, err := json.Marshal(payload)
	if err != nil {
		d.Logger.Warn("publishVerdict marshal failed", "err", err, "callId", v.CallID)
		return
	}

	id := v.CallID
	if id == "" {
		id = fmt.Sprintf("ev-%d", time.Now().UnixNano())
	}
	d.Hub.Publish(feed.Event{
		ID:        id,
		Timestamp: v.Timestamp,
		Side:      side,
		Verb:      verb,
		Level:     level,
		Payload:   string(b),
	})

	// Real counters — every analyze bumps intercepted; block / alert / clone
	// each have their own dimension.
	d.Store.IncIntercepted(1)
	switch v.Action {
	case "block":
		d.Store.IncBlocked(1)
	}
	if v.Voiceprint.Verdict == "SYNTH" {
		d.Store.IncAIClones(1)
	}
	if scriptCategory != "" {
		d.Store.IncScriptHits(1)
	}
}

func classifyVerb(v engine.Verdict) (verb, side string) {
	switch v.Action {
	case "block":
		return "BLOCK", "system"
	case "alert":
		// Pick the layer that drove the alert.
		switch {
		case v.Voiceprint.Verdict == "SYNTH":
			return "VOICEPRINT", "voice"
		case len(v.Script.Hits) > 0:
			return "FLAG", "script"
		case v.Trace.Mismatch:
			return "TRACE", "trace"
		}
		return "FLAG", "script"
	}
	return "ANALYZE", "trace"
}

func levelFromScore(score int) string {
	switch {
	case score >= 65:
		return "danger"
	case score >= 35:
		return "warn"
	default:
		return "info"
	}
}

// maskPhone hides the middle four digits while keeping country / leading
// segment legible — e.g. +86-138-****-8000.
func maskPhone(num string) string {
	if len(num) <= 4 {
		return num
	}
	out := []rune(num)
	keptDigits := 0
	i := len(out) - 1
	for ; i >= 0 && keptDigits < 4; i-- {
		if out[i] >= '0' && out[i] <= '9' {
			keptDigits++
		}
	}
	maskedDigits := 0
	for ; i >= 0 && maskedDigits < 4; i-- {
		if out[i] >= '0' && out[i] <= '9' {
			out[i] = '*'
			maskedDigits++
		}
	}
	return string(out)
}

// warroomOverview aggregates everything the dashboard needs in one round-trip:
// real business counters from store, real runtime metrics from sampler / hub /
// engine. There is no synthetic component — every number reflects an actual
// observation of this process.
func warroomOverview(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		snap := d.Store.Snapshot()
		hub := d.Hub.Stats()
		eng := d.Engine.Stats()
		latest := d.Sampler.latest()

		out := map[string]any{
			"counters": map[string]any{
				"interceptedCalls": snap.InterceptedCalls,
				"blockedCalls":     snap.BlockedCalls,
				"aiCloneDetected":  snap.AICloneDetected,
				"scriptHits":       snap.ScriptHits,
				"smsBlocked":       snap.SmsBlocked,
				"fundsHeldYuan":    snap.FundsHeldYuan,
			},
			"defcon": snap.Defcon,
			"since":  snap.Since,
			"nowUtc": snap.NowUTC,
			"hub": map[string]any{
				"subscribers": hub.Subscribers,
				"buffered":    hub.Buffered,
				"lastEventAt": hub.LastEvent,
			},
			"engine": map[string]any{
				"analyzed":       eng.Analyzed,
				"failed":         eng.Failed,
				"lastAnalyzedAt": eng.LastAnalyzed,
			},
			"runtime": map[string]any{
				"cpuPct":     latest.cpuPct,
				"memPct":     latest.memPct,
				"netRxBps":   latest.netRxBps,
				"netTxBps":   latest.netTxBps,
				"goroutines": runtime.NumGoroutine(),
				"sampledAt":  latest.at,
			},
		}
		writeEnvelope(w, http.StatusOK, out)
	}
}

// warroomLatestVoiceprint exposes the voiceprint slice of the most recent
// successful Analyze so the dashboard's Voiceprint panel shows a real number
// (or an empty body when no call has been analyzed yet).
func warroomLatestVoiceprint(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		v := d.Engine.LastVerdict()
		if v == nil {
			writeEnvelope(w, http.StatusOK, nil)
			return
		}
		writeEnvelope(w, http.StatusOK, map[string]any{
			"callId":     v.CallID,
			"ts":         v.Timestamp,
			"voiceprint": v.Voiceprint,
			"riskScore":  v.RiskScore,
			"riskLevel":  v.RiskLevel,
		})
	}
}
