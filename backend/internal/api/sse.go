package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// feedStream sends Server-Sent Events for live feed subscribers.
//
// Browsers reconnect automatically on disconnect; we honor that with retry directives.
func feedStream(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "streaming unsupported", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache, no-transform")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("X-Accel-Buffering", "no") // bypass nginx buffering

		// Retry hint + initial hello so EventSource's onopen fires immediately.
		_, _ = fmt.Fprintf(w, "retry: 3000\nevent: hello\ndata: {\"service\":\"voice-guardian\"}\n\n")
		flusher.Flush()

		ch, unsub := d.Hub.Subscribe()
		defer unsub()

		// Replay last 8 events so a fresh client has immediate context.
		for _, ev := range d.Hub.Recent(8) {
			writeSSE(w, ev)
		}
		flusher.Flush()

		// Heartbeat every 15 s to keep proxies awake.
		heartbeat := time.NewTicker(15 * time.Second)
		defer heartbeat.Stop()

		ctx := r.Context()
		for {
			select {
			case <-ctx.Done():
				return
			case ev, ok := <-ch:
				if !ok {
					return
				}
				writeSSE(w, ev)
				flusher.Flush()
			case <-heartbeat.C:
				_, _ = fmt.Fprintf(w, ": ping %d\n\n", time.Now().Unix())
				flusher.Flush()
			}
		}
	}
}

func writeSSE(w http.ResponseWriter, payload any) {
	b, err := json.Marshal(payload)
	if err != nil {
		return
	}
	_, _ = fmt.Fprintf(w, "event: feed\ndata: %s\n\n", b)
}
