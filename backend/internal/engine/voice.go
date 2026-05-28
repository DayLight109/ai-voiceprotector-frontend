package engine

import (
	"context"
	"math"
	"math/rand"
	"time"
)

// VoiceprintVerdict reports Layer 02 (synthesis detection).
type VoiceprintVerdict struct {
	SynthProbability float64 `json:"synthProbability"` // 0.0 – 1.0
	F0Jitter         float64 `json:"f0Jitter"`
	BreathScore      float64 `json:"breathScore"`
	Regularity       float64 `json:"regularity"`
	Risk             int     `json:"risk"`
	Verdict          string  `json:"verdict"` // HUMAN / SUSPECT / SYNTH
}

// AnalyzeVoiceprint inspects acoustic features. Stubbed — production
// would run an ONNX or libtorch model against a 16 kHz PCM buffer.
//
// AudioSeconds drives confidence (more audio = more certainty).
func AnalyzeVoiceprint(ctx context.Context, audioSeconds float64) (VoiceprintVerdict, error) {
	if audioSeconds <= 0 {
		audioSeconds = 0.1
	}

	// Pseudo-deterministic-ish: long calls bias toward higher synth detection
	// (since we model the demo case study where AI clone is detected after 5s).
	r := rand.New(rand.NewSource(time.Now().UnixNano()))

	// Base synthesis probability ramps with elapsed audio.
	base := 0.55 + 0.35*(1-math.Exp(-audioSeconds/3.5))
	noise := (r.Float64() - 0.5) * 0.08
	synth := clamp01(base + noise)

	jitter := 0.04 + r.Float64()*0.04
	breath := 0.25 + r.Float64()*0.20
	regularity := 0.65 + r.Float64()*0.30

	risk := int(synth * 100)
	verdict := "HUMAN"
	switch {
	case synth >= 0.85:
		verdict = "SYNTH"
	case synth >= 0.55:
		verdict = "SUSPECT"
	}

	return VoiceprintVerdict{
		SynthProbability: round2(synth),
		F0Jitter:         round3(jitter),
		BreathScore:      round2(breath),
		Regularity:       round2(regularity),
		Risk:             risk,
		Verdict:          verdict,
	}, nil
}

func clamp01(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 1 {
		return 1
	}
	return v
}

func round2(v float64) float64 { return math.Round(v*100) / 100 }
func round3(v float64) float64 { return math.Round(v*1000) / 1000 }
