// Package api — ops endpoints for service health monitoring.
//
// Exposes:
//   GET /api/v1/ops/health    aggregated snapshot for the dashboard
//   GET /api/v1/ops/ping      cheap probe used to measure RTT from the UI
//
// External dependency probes are configured via the OPS_DEPENDENCIES env var,
// formatted as a comma-separated list of "name=url" pairs. Empty by default.
package api

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
)

// processStart is captured once at package load — close enough to server boot.
var processStart = time.Now()

// Status is one of: ok | warn | down.
type Status string

const (
	StatusOK   Status = "ok"
	StatusWarn Status = "warn"
	StatusDown Status = "down"
)

type checkResult struct {
	Name    string         `json:"name"`
	Status  Status         `json:"status"`
	Message string         `json:"message,omitempty"`
	Latency int64          `json:"latencyMs,omitempty"`
	Detail  map[string]any `json:"detail,omitempty"`
}

type opsReport struct {
	Service   string        `json:"service"`
	Version   string        `json:"version"`
	Status    Status        `json:"status"`
	UptimeSec int64         `json:"uptimeSec"`
	StartedAt time.Time     `json:"startedAt"`
	NowUTC    time.Time     `json:"nowUtc"`
	Checks    []checkResult `json:"checks"`
}

func opsPing(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"ok": true,
		"ts": time.Now().UTC(),
	})
}

func opsInfo(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()

		info := map[string]any{
			"service":    "voice-guardian",
			"version":    "v2.6.1",
			"goVersion":  runtime.Version(),
			"numCPU":     runtime.NumCPU(),
			"goarch":     runtime.GOARCH,
			"goos":       runtime.GOOS,
			"pid":        os.Getpid(),
			"startedAt":  processStart,
			"uptimeSec":  int64(time.Since(processStart).Seconds()),
			"nowUtc":     time.Now().UTC(),
		}
		if hn, err := os.Hostname(); err == nil {
			info["hostname"] = hn
		}
		if h, err := host.InfoWithContext(ctx); err == nil && h != nil {
			info["platform"] = h.Platform
			info["platformVersion"] = h.PlatformVersion
			info["kernelVersion"] = h.KernelVersion
			info["kernelArch"] = h.KernelArch
			info["bootTime"] = time.Unix(int64(h.BootTime), 0)
			info["hostUptimeSec"] = h.Uptime
		}
		if v, err := mem.VirtualMemoryWithContext(ctx); err == nil && v != nil {
			info["totalMemMB"] = bytesToMB(v.Total)
		}
		if d.Sampler != nil {
			lv := d.Sampler.latest()
			info["load1"] = lv.load1
			info["load5"] = lv.load5
			info["load15"] = lv.load15
		}
		writeJSON(w, http.StatusOK, info)
	}
}

func opsSeries(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		samples := []Sample{}
		if d.Sampler != nil {
			samples = d.Sampler.Snapshot()
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"intervalSec": int(SamplerInterval / time.Second),
			"capacity":    SamplerCapacity,
			"count":       len(samples),
			"samples":     samples,
		})
	}
}

func opsHealth(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 4*time.Second)
		defer cancel()

		checks := runChecks(ctx, d)

		overall := StatusOK
		for _, c := range checks {
			if c.Status == StatusDown {
				overall = StatusDown
				break
			}
			if c.Status == StatusWarn {
				overall = StatusWarn
			}
		}

		writeJSON(w, http.StatusOK, opsReport{
			Service:   "voice-guardian",
			Version:   "v2.6.1",
			Status:    overall,
			UptimeSec: int64(time.Since(processStart).Seconds()),
			StartedAt: processStart,
			NowUTC:    time.Now().UTC(),
			Checks:    checks,
		})
	}
}

func runChecks(ctx context.Context, d Deps) []checkResult {
	deps := parseDependencies(os.Getenv("OPS_DEPENDENCIES"))

	// Slow checks run in parallel into named slots so the final order is
	// deterministic regardless of which goroutine finishes first.
	var (
		memoryRes checkResult
		diskRes   checkResult
	)
	depResults := make([]checkResult, len(deps))

	var wg sync.WaitGroup
	wg.Add(2 + len(deps))
	go func() { defer wg.Done(); memoryRes = checkMemory() }()
	go func() { defer wg.Done(); diskRes = checkDisk() }()
	for i, dep := range deps {
		i, dep := i, dep
		go func() {
			defer wg.Done()
			depResults[i] = checkHTTPDependency(ctx, dep.name, dep.url)
		}()
	}
	wg.Wait()

	// Stable display order — most important first. Service-specific
	// subsystems lead because they're the unique signal that THIS service is
	// healthy; commodity host metrics follow; external dependencies trail
	// in the order they appear in OPS_DEPENDENCIES.
	out := make([]checkResult, 0, 7+len(depResults))
	out = append(out,
		checkEngine(d),
		checkStore(d),
		checkCPU(d),
		memoryRes,
		diskRes,
		checkNetwork(d),
		checkLoad(d),
	)
	out = append(out, depResults...)
	return out
}

/* -------------------------------------------------------------------------- */
/*  Process-level checks                                                      */
/* -------------------------------------------------------------------------- */

func checkCPU(d Deps) checkResult {
	if d.Sampler == nil {
		return checkResult{Name: "cpu", Status: StatusWarn, Message: "sampler unavailable"}
	}
	lv := d.Sampler.latest()
	if lv.at.IsZero() {
		return checkResult{Name: "cpu", Status: StatusWarn, Message: "warming up"}
	}
	st := StatusOK
	switch {
	case lv.cpuPct >= 95:
		st = StatusDown
	case lv.cpuPct >= 80:
		st = StatusWarn
	}
	return checkResult{
		Name:   "cpu",
		Status: st,
		Detail: map[string]any{
			"usagePct": lv.cpuPct,
			"cores":    runtime.NumCPU(),
		},
	}
}

func checkNetwork(d Deps) checkResult {
	if d.Sampler == nil {
		return checkResult{Name: "network", Status: StatusWarn, Message: "sampler unavailable"}
	}
	lv := d.Sampler.latest()
	if !lv.hasNet {
		return checkResult{Name: "network", Status: StatusWarn, Message: "warming up"}
	}
	return checkResult{
		Name:   "network",
		Status: StatusOK,
		Detail: map[string]any{
			"rxBps":   lv.netRxBps,
			"txBps":   lv.netTxBps,
			"rxHuman": humanRate(lv.netRxBps),
			"txHuman": humanRate(lv.netTxBps),
		},
	}
}

func checkLoad(d Deps) checkResult {
	if d.Sampler == nil {
		return checkResult{Name: "load", Status: StatusWarn, Message: "sampler unavailable"}
	}
	lv := d.Sampler.latest()
	cores := float64(runtime.NumCPU())
	// load1/cores > 1.0 means saturation; warn at 0.8x cores, down at 1.5x.
	st := StatusOK
	if cores > 0 {
		switch {
		case lv.load1 >= 1.5*cores:
			st = StatusDown
		case lv.load1 >= 0.8*cores:
			st = StatusWarn
		}
	}
	msg := ""
	if lv.load1 == 0 && lv.load5 == 0 && lv.load15 == 0 {
		// Windows reports zeros — gopsutil/load doesn't synthesize on Windows.
		msg = "load average not reported on this OS"
	}
	return checkResult{
		Name:    "load",
		Status:  st,
		Message: msg,
		Detail: map[string]any{
			"load1":   lv.load1,
			"load5":   lv.load5,
			"load15":  lv.load15,
			"cores":   runtime.NumCPU(),
			"perCore": roundTo(lv.load1/maxFloat(cores, 1), 2),
		},
	}
}

func checkMemory() checkResult {
	v, err := mem.VirtualMemory()
	if err != nil {
		return checkResult{Name: "memory", Status: StatusWarn, Message: err.Error()}
	}
	st := StatusOK
	switch {
	case v.UsedPercent >= 95:
		st = StatusDown
	case v.UsedPercent >= 85:
		st = StatusWarn
	}
	return checkResult{
		Name:   "memory",
		Status: st,
		Detail: map[string]any{
			"usagePct": roundTo(v.UsedPercent, 2),
			"usedMB":   bytesToMB(v.Used),
			"totalMB":  bytesToMB(v.Total),
		},
	}
}

func checkDisk() checkResult {
	path := diskRootForOS()
	u, err := disk.Usage(path)
	if err != nil {
		return checkResult{Name: "disk", Status: StatusWarn, Message: err.Error()}
	}
	st := StatusOK
	switch {
	case u.UsedPercent >= 95:
		st = StatusDown
	case u.UsedPercent >= 85:
		st = StatusWarn
	}
	return checkResult{
		Name:   "disk",
		Status: st,
		Detail: map[string]any{
			"path":     path,
			"usagePct": roundTo(u.UsedPercent, 2),
			"usedGB":   bytesToGB(u.Used),
			"totalGB":  bytesToGB(u.Total),
		},
	}
}

/* -------------------------------------------------------------------------- */
/*  Subsystem checks (in-process components)                                  */
/* -------------------------------------------------------------------------- */

func checkStore(d Deps) checkResult {
	if d.Store == nil {
		return checkResult{Name: "store", Status: StatusDown, Message: "store nil"}
	}
	snap := d.Store.Snapshot()
	return checkResult{
		Name:   "store",
		Status: StatusOK,
		Detail: map[string]any{
			"defcon":           snap.Defcon,
			"interceptedCalls": snap.InterceptedCalls,
			"blockedCalls":     snap.BlockedCalls,
			"since":            snap.Since,
		},
	}
}

func checkEngine(d Deps) checkResult {
	if d.Engine == nil {
		return checkResult{Name: "engine", Status: StatusDown, Message: "engine nil"}
	}
	s := d.Engine.Stats()
	status := StatusOK
	if s.Analyzed > 0 && s.Failed*4 > s.Analyzed {
		status = StatusWarn
	}
	return checkResult{
		Name:   "engine",
		Status: status,
		Detail: map[string]any{
			"analyzed":     s.Analyzed,
			"failed":       s.Failed,
			"lastAnalyzed": s.LastAnalyzed,
			"lastFailed":   s.LastFailed,
		},
	}
}

/* -------------------------------------------------------------------------- */
/*  External dependencies                                                     */
/* -------------------------------------------------------------------------- */

type dependency struct {
	name string
	url  string
}

func parseDependencies(raw string) []dependency {
	if raw = strings.TrimSpace(raw); raw == "" {
		return nil
	}
	out := make([]dependency, 0, 4)
	for _, item := range strings.Split(raw, ",") {
		item = strings.TrimSpace(item)
		if item == "" {
			continue
		}
		name, url, ok := strings.Cut(item, "=")
		if !ok {
			continue
		}
		name, url = strings.TrimSpace(name), strings.TrimSpace(url)
		if name == "" || url == "" {
			continue
		}
		out = append(out, dependency{name: name, url: url})
	}
	return out
}

var depClient = &http.Client{Timeout: 3 * time.Second}

func checkHTTPDependency(ctx context.Context, name, url string) checkResult {
	start := time.Now()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return checkResult{Name: name, Status: StatusDown, Message: err.Error()}
	}
	resp, err := depClient.Do(req)
	latency := time.Since(start).Milliseconds()
	if err != nil {
		return checkResult{Name: name, Status: StatusDown, Message: err.Error(), Latency: latency}
	}
	defer resp.Body.Close()

	st := StatusOK
	if resp.StatusCode >= 500 {
		st = StatusDown
	} else if resp.StatusCode >= 400 {
		st = StatusWarn
	}
	return checkResult{
		Name:    name,
		Status:  st,
		Latency: latency,
		Detail: map[string]any{
			"url":        url,
			"statusCode": resp.StatusCode,
		},
	}
}

/* -------------------------------------------------------------------------- */
/*  helpers                                                                   */
/* -------------------------------------------------------------------------- */

func bytesToMB(b uint64) float64 { return roundTo(float64(b)/(1024*1024), 1) }
func bytesToGB(b uint64) float64 { return roundTo(float64(b)/(1024*1024*1024), 2) }

func roundTo(v float64, decimals int) float64 {
	p := 1.0
	for i := 0; i < decimals; i++ {
		p *= 10
	}
	return float64(int64(v*p+0.5)) / p
}

func maxFloat(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}

// humanRate formats bytes/sec into B/s, KB/s, MB/s, GB/s.
func humanRate(bps float64) string {
	const (
		kb = 1024.0
		mb = kb * 1024
		gb = mb * 1024
	)
	switch {
	case bps >= gb:
		return fmt.Sprintf("%.2f GB/s", bps/gb)
	case bps >= mb:
		return fmt.Sprintf("%.2f MB/s", bps/mb)
	case bps >= kb:
		return fmt.Sprintf("%.1f KB/s", bps/kb)
	default:
		return fmt.Sprintf("%.0f B/s", bps)
	}
}
