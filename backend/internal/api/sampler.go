// Package api — background sampler for time-series metrics.
//
// Samples CPU%, memory%, network bytes/s, and load average every
// SamplerInterval, keeping the most recent SamplerCapacity points in a
// ring buffer. Read it with Snapshot.
package api

import (
	"context"
	"runtime"
	"sync"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	gopsload "github.com/shirou/gopsutil/v3/load"
	"github.com/shirou/gopsutil/v3/mem"
	gopsnet "github.com/shirou/gopsutil/v3/net"
)

const (
	SamplerInterval = 2 * time.Second
	SamplerCapacity = 60 // 60 × 2s = 2 minutes of history
)

// Sample is one timeseries point.
type Sample struct {
	T          time.Time `json:"t"`
	CPUPct     float64   `json:"cpuPct"`
	MemPct     float64   `json:"memPct"`
	NetRxBps   float64   `json:"netRxBps"`
	NetTxBps   float64   `json:"netTxBps"`
	Load1      float64   `json:"load1"`
	Load5      float64   `json:"load5"`
	Load15     float64   `json:"load15"`
	Goroutines int       `json:"goroutines"`
}

// Sampler holds the rolling history and the latest derived values.
type Sampler struct {
	mu      sync.RWMutex
	ring    []Sample
	cap     int

	// for net rate calculation
	prevRx     uint64
	prevTx     uint64
	prevTaken  time.Time
	netSeeded  bool

	// latest snapshots used by check funcs (avoid double-sampling cpu)
	lastCPU    float64
	lastMem    float64
	lastNetRx  float64
	lastNetTx  float64
	lastLoad1  float64
	lastLoad5  float64
	lastLoad15 float64
	lastAt     time.Time
}

func NewSampler() *Sampler {
	return &Sampler{cap: SamplerCapacity}
}

// Start runs the sampler until ctx is cancelled.
func (s *Sampler) Start(ctx context.Context) {
	go func() {
		// First tick fires immediately so the page has data without waiting.
		s.tick(ctx)
		t := time.NewTicker(SamplerInterval)
		defer t.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-t.C:
				s.tick(ctx)
			}
		}
	}()
}

func (s *Sampler) tick(ctx context.Context) {
	now := time.Now()

	// CPU% — non-blocking sample (over the interval since last call).
	cpuPct := 0.0
	if pcts, err := cpu.PercentWithContext(ctx, 0, false); err == nil && len(pcts) > 0 {
		cpuPct = pcts[0]
	}

	memPct := 0.0
	if v, err := mem.VirtualMemoryWithContext(ctx); err == nil {
		memPct = v.UsedPercent
	}

	rxBps, txBps := 0.0, 0.0
	if ios, err := gopsnet.IOCountersWithContext(ctx, false); err == nil && len(ios) > 0 {
		rx := ios[0].BytesRecv
		tx := ios[0].BytesSent
		if s.netSeeded {
			dt := now.Sub(s.prevTaken).Seconds()
			if dt > 0 {
				rxBps = float64(diffU64(rx, s.prevRx)) / dt
				txBps = float64(diffU64(tx, s.prevTx)) / dt
			}
		}
		s.prevRx, s.prevTx, s.prevTaken, s.netSeeded = rx, tx, now, true
	}

	l1, l5, l15 := 0.0, 0.0, 0.0
	if la, err := gopsload.AvgWithContext(ctx); err == nil && la != nil {
		l1, l5, l15 = la.Load1, la.Load5, la.Load15
	}

	sample := Sample{
		T:          now,
		CPUPct:     roundTo(cpuPct, 2),
		MemPct:     roundTo(memPct, 2),
		NetRxBps:   roundTo(rxBps, 0),
		NetTxBps:   roundTo(txBps, 0),
		Load1:      roundTo(l1, 2),
		Load5:      roundTo(l5, 2),
		Load15:     roundTo(l15, 2),
		Goroutines: runtime.NumGoroutine(),
	}

	s.mu.Lock()
	s.ring = append(s.ring, sample)
	if len(s.ring) > s.cap {
		s.ring = s.ring[len(s.ring)-s.cap:]
	}
	s.lastCPU = sample.CPUPct
	s.lastMem = sample.MemPct
	s.lastNetRx = sample.NetRxBps
	s.lastNetTx = sample.NetTxBps
	s.lastLoad1, s.lastLoad5, s.lastLoad15 = sample.Load1, sample.Load5, sample.Load15
	s.lastAt = now
	s.mu.Unlock()
}

// Snapshot returns a copy of the ring buffer (oldest first).
func (s *Sampler) Snapshot() []Sample {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Sample, len(s.ring))
	copy(out, s.ring)
	return out
}

// Latest exposes the most recent derived values without blocking on samples.
type latestValues struct {
	cpuPct, memPct                 float64
	netRxBps, netTxBps             float64
	load1, load5, load15           float64
	at                             time.Time
	hasNet                         bool
}

func (s *Sampler) latest() latestValues {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return latestValues{
		cpuPct:   s.lastCPU,
		memPct:   s.lastMem,
		netRxBps: s.lastNetRx,
		netTxBps: s.lastNetTx,
		load1:    s.lastLoad1,
		load5:    s.lastLoad5,
		load15:   s.lastLoad15,
		at:       s.lastAt,
		hasNet:   s.netSeeded && len(s.ring) >= 2,
	}
}

func diffU64(curr, prev uint64) uint64 {
	if curr < prev {
		// counter wrap or interface reset — treat as zero.
		return 0
	}
	return curr - prev
}
