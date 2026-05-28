# Voice Guardian · Backend

Go 1.22 service that powers the Threat Operations Console.

## Endpoints (REST + SSE)

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/v1/health` | Liveness probe. |
| `GET` | `/api/v1/stats` | Global counters (intercepted / blocked / AI clones / etc.). |
| `GET` | `/api/v1/defcon` | Current threat level. |
| `POST` | `/api/v1/defcon` | `{ "level": 1..5 }` — override the level. |
| `GET` | `/api/v1/feed?n=32` | Recent feed events (newest last). |
| `GET` | `/api/v1/feed/stream` | **Server-Sent Events** — `event: feed`, `data: {…}`. |
| `GET` | `/api/v1/threats` | Last 16 danger-level events. |
| `POST` | `/api/v1/analyze` | Run all three analysis layers on a call. |

### `POST /api/v1/analyze`

```jsonc
// request
{
  "callId":         "case-2025-04-28-1437",
  "shownNumber":    "+86-138-XXXX-XX21",
  "signalOriginCC": "MM",
  "audioSeconds":   6.4,
  "transcriptHint": "你可不要告诉我爸妈，把钱打到这个安全账户。"
}

// response
{
  "callId": "case-2025-04-28-1437",
  "ts": "2026-05-13T14:37:18.422Z",
  "trace":      { "shownRegistry": "CN/BJ", "actualOrigin": "MM", "mismatch": true, "hopCount": 5, "risk": 86, … },
  "voiceprint": { "synthProbability": 0.92, "f0Jitter": 0.041, "regularity": 0.88, "risk": 92, "verdict": "SYNTH" },
  "script":     { "hits": [{ "category": "引导转账", "weight": 92 }, …], "risk": 96 },
  "riskScore":  94,
  "riskLevel":  "BLOCK",
  "action":     "block",
  "latencyMillis": 28
}
```

## Run

```bash
cd backend
go mod tidy
go run ./cmd/server -addr=:8080
```

Then from another shell:

```bash
curl http://localhost:8080/api/v1/health
curl http://localhost:8080/api/v1/stats
curl -N http://localhost:8080/api/v1/feed/stream
```

## Layout

```
backend/
├── cmd/server/main.go              · entry point + graceful shutdown
└── internal/
    ├── api/                        · chi router, JSON handlers, SSE
    ├── engine/                     · three analysis layers + merge
    ├── feed/                       · in-memory pub/sub + event simulator
    └── store/                      · atomic counters
```

## Notes

- `internal/engine` is intentionally stubbed for the demo. In production, swap:
  - `voice.go` → ONNX / libtorch inference on 16 kHz PCM.
  - `trace.go` → real SS7/SIP signaling-layer lookup.
  - `script.go` → fine-tuned classifier on top of the lexicon priors.
- `internal/feed/Simulate` generates console events. Remove it in production
  and `Publish` from the engine instead.
- SSE was chosen over WebSocket: unidirectional, plays nicely with HTTP/2,
  reconnects for free, debuggable with `curl -N`.
