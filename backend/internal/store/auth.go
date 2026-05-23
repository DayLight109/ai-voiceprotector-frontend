// Auth & user store — backed by PostgreSQL.
//
// Five demo accounts (family / biz / family-admin / admin / sysadmin) are
// idempotently seeded on Open with the password "demo123" (bcrypt-hashed).
// Existing rows keep whatever password the user has since changed to.
//
// Tokens (access + refresh) live in auth_sessions. Each access-token row also
// carries device_label / ip / user_agent / last_seen_at so the settings page
// can show "this device" and revoke individual sessions.
package store

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

// User is the public-facing user record.
type User struct {
	ID        string    `json:"id"`
	TenantID  string    `json:"tenantId"`
	Account   string    `json:"account"`
	Name      string    `json:"name"`
	Phone     string    `json:"phone,omitempty"`
	Email     string    `json:"email,omitempty"`
	Role      string    `json:"role"`
	Status    string    `json:"status"`
	Dept      string    `json:"dept,omitempty"`
	HasAvatar bool      `json:"hasAvatar"`
	CreatedAt time.Time `json:"createdAt"`
}

// Session is one row in auth_sessions, exposed for /me/sessions.
type Session struct {
	Token       string    `json:"token"`
	DeviceLabel string    `json:"deviceLabel"`
	IP          string    `json:"ip"`
	UserAgent   string    `json:"userAgent"`
	CreatedAt   time.Time `json:"createdAt"`
	LastSeenAt  time.Time `json:"lastSeenAt"`
	ExpiresAt   time.Time `json:"expiresAt"`
}

var (
	ErrUserNotFound = errors.New("user not found")
	ErrBadPassword  = errors.New("bad password")
	ErrAccountTaken = errors.New("account taken")
)

const userColumns = `u.id, u.tenant_id, u.account, u.name, u.phone, u.email, u.role, u.status, u.dept,
    (u.avatar_mime <> '') AS has_avatar, u.created_at`

func scanUser(row pgx.Row) (User, error) {
	var u User
	err := row.Scan(&u.ID, &u.TenantID, &u.Account, &u.Name, &u.Phone, &u.Email,
		&u.Role, &u.Status, &u.Dept, &u.HasAvatar, &u.CreatedAt)
	return u, err
}

// SeedDemoUsers inserts the 5 demo accounts if they don't already exist.
// Existing rows are left untouched so password changes survive restarts.
func (s *Store) SeedDemoUsers(ctx context.Context) error {
	demos := []struct {
		ID, Account, Name, Role, Phone string
	}{
		{"u_family", "family", "王磊", "family", "138 0013 4921"},
		{"u_biz", "biz", "李娜", "biz", "139 1234 5678"},
		{"u_fadmin", "family-admin", "张伟", "family_admin", "137 7777 8888"},
		{"u_admin", "admin", "刘强", "admin", "136 1111 2222"},
		{"u_sysadmin", "sysadmin", "陈静", "sysadmin", "135 0000 9999"},
	}
	hash, err := bcrypt.GenerateFromPassword([]byte("demo123"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	const q = `INSERT INTO auth_users (id, account, name, role, phone, password_hash)
	           VALUES ($1, $2, $3, $4, $5, $6)
	           ON CONFLICT (id) DO NOTHING`
	for _, d := range demos {
		if _, err := s.pool.Exec(ctx, q, d.ID, d.Account, d.Name, d.Role, d.Phone, string(hash)); err != nil {
			return err
		}
	}
	return nil
}

// LookupByAccount finds a user by login account (case-insensitive).
func (s *Store) LookupByAccount(account string) (User, bool) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	q := `SELECT ` + userColumns + ` FROM auth_users u WHERE lower(u.account) = lower($1)`
	u, err := scanUser(s.pool.QueryRow(ctx, q, strings.TrimSpace(account)))
	if err != nil {
		return User{}, false
	}
	return u, true
}

// AuthenticatePassword returns the user if account+password matches.
func (s *Store) AuthenticatePassword(account, password string) (User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	q := `SELECT ` + userColumns + `, u.password_hash FROM auth_users u WHERE lower(u.account) = lower($1)`
	row := s.pool.QueryRow(ctx, q, strings.TrimSpace(account))
	var u User
	var hash string
	err := row.Scan(&u.ID, &u.TenantID, &u.Account, &u.Name, &u.Phone, &u.Email,
		&u.Role, &u.Status, &u.Dept, &u.HasAvatar, &u.CreatedAt, &hash)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, ErrUserNotFound
		}
		return User{}, err
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
		return User{}, ErrBadPassword
	}
	return u, nil
}

// RegisterUser creates a new user. Returns ErrAccountTaken if account exists.
func (s *Store) RegisterUser(account, password, name, phone, email, role string) (User, error) {
	account = strings.TrimSpace(account)
	if account == "" || password == "" {
		return User{}, errors.New("account and password required")
	}
	if role != "family" && role != "biz" {
		role = "family"
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return User{}, err
	}
	id := "u_" + randomToken(8)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	const q = `INSERT INTO auth_users (id, account, name, phone, email, role, password_hash)
	           VALUES ($1, $2, $3, $4, $5, $6, $7)`
	if _, err := s.pool.Exec(ctx, q, id, account, strings.TrimSpace(name),
		strings.TrimSpace(phone), strings.TrimSpace(email), role, string(hash)); err != nil {
		if isUniqueViolation(err) {
			return User{}, ErrAccountTaken
		}
		return User{}, err
	}
	u, ok := s.LookupByAccount(account)
	if !ok {
		return User{}, errors.New("user vanished after insert")
	}
	return u, nil
}

// ChangePassword verifies oldPassword and replaces it with newPassword.
func (s *Store) ChangePassword(userID, oldPassword, newPassword string) error {
	if newPassword == "" {
		return errors.New("new password required")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var hash string
	if err := s.pool.QueryRow(ctx, `SELECT password_hash FROM auth_users WHERE id = $1`, userID).Scan(&hash); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrUserNotFound
		}
		return err
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(oldPassword)) != nil {
		return ErrBadPassword
	}
	newHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx,
		`UPDATE auth_users SET password_hash = $1, password_updated_at = now() WHERE id = $2`,
		string(newHash), userID)
	return err
}

// IssueTokens creates an access+refresh pair for a user with device context.
// access valid 1h, refresh valid 30d.
func (s *Store) IssueTokens(userID, deviceLabel, ip, userAgent string) (access, refresh string, expiresAt time.Time, err error) {
	access = randomToken(32)
	refresh = randomToken(32)
	now := time.Now().UTC()
	expiresAt = now.Add(1 * time.Hour)
	refreshExp := now.Add(30 * 24 * time.Hour)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	const q = `INSERT INTO auth_sessions
	    (token, user_id, kind, device_label, ip, user_agent, expires_at)
	    VALUES ($1, $2, $3, $4, $5, $6, $7)`
	if _, err = s.pool.Exec(ctx, q, access, userID, "access", deviceLabel, ip, userAgent, expiresAt); err != nil {
		return "", "", time.Time{}, err
	}
	if _, err = s.pool.Exec(ctx, q, refresh, userID, "refresh", deviceLabel, ip, userAgent, refreshExp); err != nil {
		return "", "", time.Time{}, err
	}
	return access, refresh, expiresAt, nil
}

// ResolveAccessToken returns the user the access token belongs to.
// Also updates last_seen_at as a side-effect.
func (s *Store) ResolveAccessToken(token string) (User, bool) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	q := `SELECT ` + userColumns + `
	      FROM auth_users u
	      JOIN auth_sessions s ON s.user_id = u.id
	      WHERE s.token = $1 AND s.kind = 'access' AND s.expires_at > now()`
	u, err := scanUser(s.pool.QueryRow(ctx, q, token))
	if err != nil {
		return User{}, false
	}
	_, _ = s.pool.Exec(ctx, `UPDATE auth_sessions SET last_seen_at = now() WHERE token = $1`, token)
	return u, true
}

// RotateRefreshToken validates an old refresh token, deletes it, and issues a new pair.
func (s *Store) RotateRefreshToken(refresh, deviceLabel, ip, userAgent string) (User, string, string, time.Time, bool) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var userID string
	var existingDevice, existingIP, existingUA string
	err := s.pool.QueryRow(ctx,
		`SELECT user_id, device_label, ip, user_agent FROM auth_sessions
		 WHERE token = $1 AND kind = 'refresh' AND expires_at > now()`, refresh).
		Scan(&userID, &existingDevice, &existingIP, &existingUA)
	if err != nil {
		_, _ = s.pool.Exec(ctx, `DELETE FROM auth_sessions WHERE token = $1`, refresh)
		return User{}, "", "", time.Time{}, false
	}
	_, _ = s.pool.Exec(ctx, `DELETE FROM auth_sessions WHERE token = $1`, refresh)

	q := `SELECT ` + userColumns + ` FROM auth_users u WHERE u.id = $1`
	u, err := scanUser(s.pool.QueryRow(ctx, q, userID))
	if err != nil {
		return User{}, "", "", time.Time{}, false
	}
	if deviceLabel == "" {
		deviceLabel = existingDevice
	}
	if ip == "" {
		ip = existingIP
	}
	if userAgent == "" {
		userAgent = existingUA
	}
	a, r, exp, err := s.IssueTokens(u.ID, deviceLabel, ip, userAgent)
	if err != nil {
		return User{}, "", "", time.Time{}, false
	}
	return u, a, r, exp, true
}

// RevokeAccessToken deletes the access token row (used by logout).
func (s *Store) RevokeAccessToken(token string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, _ = s.pool.Exec(ctx, `DELETE FROM auth_sessions WHERE token = $1 AND kind = 'access'`, token)
}

// ListSessions returns all access sessions for a user, most-recently-active first.
func (s *Store) ListSessions(userID string) []Session {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	rows, err := s.pool.Query(ctx,
		`SELECT token, device_label, ip, user_agent, created_at, expires_at, last_seen_at
		 FROM auth_sessions
		 WHERE user_id = $1 AND kind = 'access' AND expires_at > now()
		 ORDER BY last_seen_at DESC`, userID)
	if err != nil {
		return []Session{}
	}
	defer rows.Close()
	out := []Session{}
	for rows.Next() {
		var sess Session
		if err := rows.Scan(&sess.Token, &sess.DeviceLabel, &sess.IP, &sess.UserAgent,
			&sess.CreatedAt, &sess.ExpiresAt, &sess.LastSeenAt); err != nil {
			return out
		}
		out = append(out, sess)
	}
	return out
}

// RevokeSession deletes a single session (must belong to user).
// Returns ErrUserNotFound when not found / not owned.
func (s *Store) RevokeSession(userID, token string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	tag, err := s.pool.Exec(ctx,
		`DELETE FROM auth_sessions WHERE user_id = $1 AND token = $2`, userID, token)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrUserNotFound
	}
	return nil
}

// RevokeOtherSessions deletes every session for the user except the given keep token.
func (s *Store) RevokeOtherSessions(userID, keepToken string) (int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	tag, err := s.pool.Exec(ctx,
		`DELETE FROM auth_sessions WHERE user_id = $1 AND token <> $2`, userID, keepToken)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

// UpdateUserProfile patches name/phone/email/dept. Empty string means "no change".
func (s *Store) UpdateUserProfile(userID, name, phone, email, dept string) (User, bool) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	const q = `UPDATE auth_users AS u SET
	    name  = COALESCE(NULLIF($2, ''), u.name),
	    phone = COALESCE(NULLIF($3, ''), u.phone),
	    email = COALESCE(NULLIF($4, ''), u.email),
	    dept  = COALESCE(NULLIF($5, ''), u.dept)
	  WHERE u.id = $1
	  RETURNING ` + userColumns
	u, err := scanUser(s.pool.QueryRow(ctx, q, userID,
		strings.TrimSpace(name), strings.TrimSpace(phone),
		strings.TrimSpace(email), strings.TrimSpace(dept)))
	if err != nil {
		return User{}, false
	}
	return u, true
}

// SetAvatar stores avatar bytes for a user.
func (s *Store) SetAvatar(userID, mime string, data []byte) bool {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	tag, err := s.pool.Exec(ctx,
		`UPDATE auth_users SET avatar_mime = $1, avatar_data = $2 WHERE id = $3`,
		mime, data, userID)
	return err == nil && tag.RowsAffected() == 1
}

// GetAvatar returns the avatar mime+bytes if any.
func (s *Store) GetAvatar(userID string) (string, []byte, bool) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var mime string
	var data []byte
	err := s.pool.QueryRow(ctx,
		`SELECT avatar_mime, avatar_data FROM auth_users WHERE id = $1`, userID).
		Scan(&mime, &data)
	if err != nil || mime == "" || len(data) == 0 {
		return "", nil, false
	}
	return mime, data, true
}

// ClearAvatar removes the avatar.
func (s *Store) ClearAvatar(userID string) bool {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	tag, err := s.pool.Exec(ctx,
		`UPDATE auth_users SET avatar_mime = '', avatar_data = NULL WHERE id = $1`, userID)
	return err == nil && tag.RowsAffected() == 1
}

func randomToken(n int) string {
	buf := make([]byte, n)
	_, _ = rand.Read(buf)
	return base64.RawURLEncoding.EncodeToString(buf)
}
