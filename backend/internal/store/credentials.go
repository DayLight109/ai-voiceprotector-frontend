// Identity credentials store — in-memory, single user "me".
//
// Demo-grade: persists nothing across restarts. Photos are kept as base64
// data URLs alongside the credential record so the frontend can re-render
// previews without a separate /photos route.
package store

import (
	"crypto/sha256"
	"encoding/hex"
	"sort"
	"strings"
	"sync"
	"time"
)

const meUID = "me"

// CredKind enumerates the supported document kinds.
var CredKinds = map[string]struct{}{
	"phone": {}, "id": {}, "passport": {}, "military": {}, "hkmo": {},
}

// Photo is one stored image attached to a credential slot.
type Photo struct {
	Slot      string    `json:"slot"`           // face | emblem | main
	Name      string    `json:"name"`
	Size      int64     `json:"size"`
	MIME      string    `json:"mime"`
	DataURL   string    `json:"dataUrl"`        // base64 data: URI
	UpdatedAt time.Time `json:"updatedAt"`
}

// Credential is one identity document of a user.
type Credential struct {
	Kind      string    `json:"kind"`
	Masked    string    `json:"masked"`         // last 4 visible
	Hash      string    `json:"-"`              // sha256(value)
	Verified  bool      `json:"verified"`
	Photos    []Photo   `json:"photos"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// IdentityMode is one toggle (offline / relative / care).
type IdentityMode struct {
	Key     string `json:"key"`
	Enabled bool   `json:"enabled"`
}

type credBag struct {
	mu    sync.RWMutex
	creds map[string]Credential // kind -> Credential
	modes map[string]bool       // key -> enabled
}

func newCredBag() *credBag {
	return &credBag{
		creds: map[string]Credential{},
		modes: map[string]bool{"offline": false, "relative": true, "care": false},
	}
}

// CredList returns all stored credentials sorted by kind.
func (s *Store) CredList() []Credential {
	s.cb.mu.RLock()
	defer s.cb.mu.RUnlock()
	out := make([]Credential, 0, len(s.cb.creds))
	for _, c := range s.cb.creds {
		out = append(out, c)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Kind < out[j].Kind })
	return out
}

// CredGet fetches a single credential.
func (s *Store) CredGet(kind string) (Credential, bool) {
	s.cb.mu.RLock()
	defer s.cb.mu.RUnlock()
	c, ok := s.cb.creds[kind]
	return c, ok
}

// CredSubmit inserts or updates the value for a credential.
// The plaintext value is hashed before storage; only the last 4 chars are kept
// visible (masked field). Existing photos are preserved across submits.
func (s *Store) CredSubmit(kind, value string, verified bool) Credential {
	v := strings.TrimSpace(value)
	sum := sha256.Sum256([]byte(v))

	s.cb.mu.Lock()
	defer s.cb.mu.Unlock()
	prev := s.cb.creds[kind]
	c := Credential{
		Kind:      kind,
		Masked:    maskValue(v),
		Hash:      hex.EncodeToString(sum[:]),
		Verified:  verified,
		Photos:    prev.Photos,
		UpdatedAt: time.Now().UTC(),
	}
	s.cb.creds[kind] = c
	return c
}

// CredDelete removes a credential and all its photos.
func (s *Store) CredDelete(kind string) bool {
	s.cb.mu.Lock()
	defer s.cb.mu.Unlock()
	if _, ok := s.cb.creds[kind]; !ok {
		return false
	}
	delete(s.cb.creds, kind)
	return true
}

// CredAttachPhoto upserts a photo for the given slot. It auto-creates a
// pending (unverified) credential record if none exists yet, so the user can
// upload photos before typing the document number.
func (s *Store) CredAttachPhoto(kind string, p Photo) Credential {
	s.cb.mu.Lock()
	defer s.cb.mu.Unlock()
	c, ok := s.cb.creds[kind]
	if !ok {
		c = Credential{Kind: kind, UpdatedAt: time.Now().UTC()}
	}
	replaced := false
	for i, ex := range c.Photos {
		if ex.Slot == p.Slot {
			c.Photos[i] = p
			replaced = true
			break
		}
	}
	if !replaced {
		c.Photos = append(c.Photos, p)
	}
	c.UpdatedAt = time.Now().UTC()
	s.cb.creds[kind] = c
	return c
}

// CredRemovePhoto deletes one slot's photo. Returns true if removed.
func (s *Store) CredRemovePhoto(kind, slot string) bool {
	s.cb.mu.Lock()
	defer s.cb.mu.Unlock()
	c, ok := s.cb.creds[kind]
	if !ok {
		return false
	}
	out := c.Photos[:0]
	removed := false
	for _, p := range c.Photos {
		if p.Slot == slot {
			removed = true
			continue
		}
		out = append(out, p)
	}
	if !removed {
		return false
	}
	c.Photos = out
	c.UpdatedAt = time.Now().UTC()
	s.cb.creds[kind] = c
	return true
}

// IdentityModes returns all toggles in stable order.
func (s *Store) IdentityModes() []IdentityMode {
	s.cb.mu.RLock()
	defer s.cb.mu.RUnlock()
	keys := []string{"offline", "relative", "care"}
	out := make([]IdentityMode, 0, len(keys))
	for _, k := range keys {
		out = append(out, IdentityMode{Key: k, Enabled: s.cb.modes[k]})
	}
	return out
}

// SetIdentityModes merges incoming items; unknown keys are ignored.
func (s *Store) SetIdentityModes(items []IdentityMode) []IdentityMode {
	s.cb.mu.Lock()
	for _, it := range items {
		if _, ok := s.cb.modes[it.Key]; !ok {
			continue
		}
		s.cb.modes[it.Key] = it.Enabled
	}
	s.cb.mu.Unlock()
	return s.IdentityModes()
}

func maskValue(v string) string {
	r := []rune(v)
	if len(r) <= 4 {
		return strings.Repeat("•", len(r))
	}
	return strings.Repeat("•", len(r)-4) + string(r[len(r)-4:])
}
