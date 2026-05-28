package engine

import (
	"context"
	"sort"
	"strings"
)

// ScriptHit is a single matched fraud pattern.
type ScriptHit struct {
	Category string `json:"category"`
	Phrase   string `json:"phrase"`
	Weight   int    `json:"weight"` // 0–100
}

// ScriptVerdict reports Layer 03 (semantic NLU on the transcript).
type ScriptVerdict struct {
	Hits []ScriptHit `json:"hits"`
	Risk int         `json:"risk"`
}

// categories is the canonical fraud-script lexicon. Production uses a fine-tuned
// classifier on top of these as priors; here we expose them for visibility.
var categories = []struct {
	Name    string
	Phrases []string
	Weight  int
}{
	{
		Name:   "切断外部联系",
		Weight: 78,
		Phrases: []string{
			"不能告诉家人", "不要告诉爸妈", "不要告诉别人", "可不要告诉",
			"先静音", "不能挂电话", "保持通话",
		},
	},
	{
		Name:   "制造紧迫感",
		Weight: 72,
		Phrases: []string{
			"今天必须", "马上", "立刻", "再晚就来不及", "现在就",
			"不能拖", "限时", "12 小时内",
		},
	},
	{
		Name:   "引导转账",
		Weight: 92,
		Phrases: []string{
			"安全账户", "打到这个账户", "打款", "转账", "资金核查",
			"清查资金", "公安账户", "保险账户",
		},
	},
	{
		Name:   "假冒权威",
		Weight: 80,
		Phrases: []string{
			"我是警察", "我是公安", "我是检察院", "法院传票",
			"涉嫌洗钱", "你的身份证被冒用",
		},
	},
	{
		Name:   "索要敏感信息",
		Weight: 88,
		Phrases: []string{
			"验证码", "银行卡号", "支付密码", "身份证号",
			"短信代码", "银行短信",
		},
	},
}

// AnalyzeScript scans the transcript for fraud patterns and aggregates risk.
//
// Empty transcript returns a low-risk verdict — absence of evidence is not evidence.
func AnalyzeScript(ctx context.Context, transcript string) (ScriptVerdict, error) {
	t := norm(transcript)
	if t == "" {
		return ScriptVerdict{Risk: 5}, nil
	}

	hits := []ScriptHit{}
	seenCat := map[string]bool{}

	for _, cat := range categories {
		for _, p := range cat.Phrases {
			if strings.Contains(t, strings.ToLower(p)) {
				if !seenCat[cat.Name] {
					hits = append(hits, ScriptHit{
						Category: cat.Name,
						Phrase:   p,
						Weight:   cat.Weight,
					})
					seenCat[cat.Name] = true
				}
				break
			}
		}
	}

	// Sort hits by weight descending so callers can render them in priority order.
	sort.SliceStable(hits, func(i, j int) bool { return hits[i].Weight > hits[j].Weight })

	risk := scoreScript(hits)
	return ScriptVerdict{Hits: hits, Risk: risk}, nil
}

// scoreScript combines hits with diminishing returns — two patterns count
// for more than one, but four count for only slightly more than three.
func scoreScript(hits []ScriptHit) int {
	if len(hits) == 0 {
		return 8
	}
	max := 0
	sum := 0
	for _, h := range hits {
		if h.Weight > max {
			max = h.Weight
		}
		sum += h.Weight
	}
	extras := sum - max
	combined := max + extras/3
	if combined > 99 {
		combined = 99
	}
	return combined
}
