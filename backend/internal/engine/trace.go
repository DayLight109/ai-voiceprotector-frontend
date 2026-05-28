package engine

import (
	"context"
	"errors"
	"strings"
)

// TraceVerdict reports Layer 01 (origin trace).
type TraceVerdict struct {
	ShownRegistry string `json:"shownRegistry"` // e.g. "CN/BJ"
	ActualOrigin  string `json:"actualOrigin"`  // e.g. "MM/YGN"
	Mismatch      bool   `json:"mismatch"`
	HopCount      int    `json:"hopCount"`
	Risk          int    `json:"risk"` // 0–100
	Note          string `json:"note"`
}

// AnalyzeTrace compares declared registry vs signal-layer ASN/route.
// The implementation here is deterministic-stub: real deployments would
// look up SS7/SIP signaling traces.
func AnalyzeTrace(ctx context.Context, shownNumber, signalOriginCC string) (TraceVerdict, error) {
	if shownNumber == "" {
		return TraceVerdict{}, errors.New("shownNumber required")
	}

	registry := guessRegistry(shownNumber)
	originCC := strings.ToUpper(strings.TrimSpace(signalOriginCC))
	if originCC == "" {
		originCC = "CN"
	}
	mismatch := !strings.HasPrefix(registry, originCC)

	risk := 6
	hops := 2
	note := "registry matches signal route"
	if mismatch {
		hops = 5
		risk = 86
		note = "signal origin " + originCC + " ≠ declared registry " + registry
	}

	return TraceVerdict{
		ShownRegistry: registry,
		ActualOrigin:  originCC,
		Mismatch:      mismatch,
		HopCount:      hops,
		Risk:          risk,
		Note:          note,
	}, nil
}

// guessRegistry derives the declared registry from a CC prefix.
// Vast oversimplification — production uses dialing-plan tables.
func guessRegistry(num string) string {
	num = strings.TrimSpace(num)
	switch {
	case strings.HasPrefix(num, "+86"):
		return "CN/BJ"
	case strings.HasPrefix(num, "+852"):
		return "HK"
	case strings.HasPrefix(num, "+886"):
		return "TW"
	case strings.HasPrefix(num, "+1"):
		return "US"
	case strings.HasPrefix(num, "+855"):
		return "KH"
	case strings.HasPrefix(num, "+95"):
		return "MM"
	}
	return "??"
}
