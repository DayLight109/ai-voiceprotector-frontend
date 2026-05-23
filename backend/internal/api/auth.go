// Auth API — login / register / refresh / logout / me, plus avatar uploads.
//
// Demo only: tokens stored in-memory, 5 seeded accounts (password "demo123"),
// no email verification, no rate limiting, no audit log.
//
// All /me/* routes are authenticated. To keep older demo flows working,
// requireAuth falls back to user "u_family" when no token is provided —
// that's the same identity any anonymous /me/credentials caller used to act
// as before this commit. Once the frontend is fully wired through /auth/login,
// remove the fallback.
package api

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/voiceguardian/backend/internal/store"
)

const (
	maxAvatarBytes = 2 * 1024 * 1024
	maxAvatarForm  = 4 * 1024 * 1024
)

type ctxUserKey struct{}
type ctxTokenKey struct{}

// requireAuth resolves the bearer token; on absence falls back to demo user "u_family".
func requireAuth(d Deps, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		token = strings.TrimSpace(token)

		var user store.User
		var ok bool
		if token != "" {
			user, ok = d.Store.ResolveAccessToken(token)
			if !ok {
				writeAPIError(w, http.StatusUnauthorized, "AUTH_TOKEN_INVALID", "token expired or invalid")
				return
			}
		} else {
			user, ok = d.Store.LookupByAccount("family")
			if !ok {
				writeAPIError(w, http.StatusUnauthorized, "AUTH_REQUIRED", "missing bearer token")
				return
			}
		}

		ctx := context.WithValue(r.Context(), ctxUserKey{}, user)
		ctx = context.WithValue(ctx, ctxTokenKey{}, token)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func currentUser(r *http.Request) (store.User, bool) {
	u, ok := r.Context().Value(ctxUserKey{}).(store.User)
	return u, ok
}

func currentToken(r *http.Request) string {
	t, _ := r.Context().Value(ctxTokenKey{}).(string)
	return t
}

// deviceContext extracts a stable device label, ip and ua for an auth-issuing request.
func deviceContext(r *http.Request) (label, ip, ua string) {
	label = strings.TrimSpace(r.Header.Get("X-Device-Label"))
	ua = r.Header.Get("User-Agent")
	if label == "" {
		label = guessDeviceLabel(ua)
	}
	ip = clientIP(r)
	return
}

func clientIP(r *http.Request) string {
	if v := r.Header.Get("X-Forwarded-For"); v != "" {
		if i := strings.IndexByte(v, ','); i >= 0 {
			return strings.TrimSpace(v[:i])
		}
		return strings.TrimSpace(v)
	}
	if v := r.Header.Get("X-Real-IP"); v != "" {
		return strings.TrimSpace(v)
	}
	host := r.RemoteAddr
	if i := strings.LastIndex(host, ":"); i >= 0 {
		host = host[:i]
	}
	return host
}

func guessDeviceLabel(ua string) string {
	low := strings.ToLower(ua)
	switch {
	case strings.Contains(low, "iphone"):
		return "iPhone"
	case strings.Contains(low, "ipad"):
		return "iPad"
	case strings.Contains(low, "android"):
		return "Android 设备"
	case strings.Contains(low, "macintosh"), strings.Contains(low, "mac os x"):
		return "Mac"
	case strings.Contains(low, "windows"):
		return "Windows PC"
	case strings.Contains(low, "linux"):
		return "Linux PC"
	}
	return "未知设备"
}

// ── Login ──

func authLogin(d Deps) http.HandlerFunc {
	type req struct {
		Account  string `json:"account"`
		Password string `json:"password"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		var body req
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json")
			return
		}
		u, err := d.Store.AuthenticatePassword(body.Account, body.Password)
		if err != nil {
			if errors.Is(err, store.ErrUserNotFound) || errors.Is(err, store.ErrBadPassword) {
				writeAPIError(w, http.StatusUnauthorized, "AUTH_INVALID_CREDENTIALS", "账号或密码错误")
				return
			}
			writeAPIError(w, http.StatusInternalServerError, "AUTH_FAILED", err.Error())
			return
		}
		label, ip, ua := deviceContext(r)
		access, refresh, exp, err := d.Store.IssueTokens(u.ID, label, ip, ua)
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "AUTH_ISSUE_FAILED", "issue tokens failed")
			return
		}
		writeEnvelope(w, http.StatusOK, map[string]any{
			"user":         u,
			"accessToken":  access,
			"refreshToken": refresh,
			"expiresAt":    exp,
		})
	}
}

// ── Register ──

func authRegister(d Deps) http.HandlerFunc {
	type req struct {
		Account  string `json:"account"`
		Password string `json:"password"`
		Name     string `json:"name"`
		Phone    string `json:"phone"`
		Email    string `json:"email"`
		Role     string `json:"role"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		var body req
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json")
			return
		}
		// 前端 register 调用未必带 account，用 phone / email 兜底（保持 lib/api.ts 不变）
		account := strings.TrimSpace(body.Account)
		if account == "" {
			account = strings.TrimSpace(body.Phone)
		}
		if account == "" {
			account = strings.TrimSpace(body.Email)
		}
		if account == "" || body.Password == "" {
			writeAPIError(w, http.StatusBadRequest, "VALIDATION_FAILED", "account/phone/email and password required")
			return
		}
		if len(body.Password) < 6 {
			writeAPIError(w, http.StatusBadRequest, "VALIDATION_FAILED", "password too short (>= 6)")
			return
		}
		u, err := d.Store.RegisterUser(account, body.Password, body.Name, body.Phone, body.Email, body.Role)
		if err != nil {
			if errors.Is(err, store.ErrAccountTaken) {
				writeAPIError(w, http.StatusConflict, "AUTH_ACCOUNT_TAKEN", "账号已被占用")
				return
			}
			writeAPIError(w, http.StatusBadRequest, "VALIDATION_FAILED", err.Error())
			return
		}
		writeEnvelope(w, http.StatusOK, u)
	}
}

// ── Refresh ──

func authRefresh(d Deps) http.HandlerFunc {
	type req struct {
		RefreshToken string `json:"refreshToken"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		var body req
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json")
			return
		}
		u, access, refresh, exp, ok := d.Store.RotateRefreshToken(body.RefreshToken, "", "", "")
		if !ok {
			writeAPIError(w, http.StatusUnauthorized, "AUTH_REFRESH_INVALID", "refresh token invalid or expired")
			return
		}
		writeEnvelope(w, http.StatusOK, map[string]any{
			"user":         u,
			"accessToken":  access,
			"refreshToken": refresh,
			"expiresAt":    exp,
		})
	}
}

// ── Logout ──

func authLogout(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		token = strings.TrimSpace(token)
		if token != "" {
			d.Store.RevokeAccessToken(token)
		}
		writeEnvelope(w, http.StatusOK, map[string]any{"ok": true})
	}
}

// ── Me ──

func meGet(_ Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, _ := currentUser(r)
		writeEnvelope(w, http.StatusOK, u)
	}
}

func meUpdate(d Deps) http.HandlerFunc {
	type req struct {
		Name  string `json:"name"`
		Phone string `json:"phone"`
		Email string `json:"email"`
		Dept  string `json:"dept"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		me, _ := currentUser(r)
		var body req
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json")
			return
		}
		updated, ok := d.Store.UpdateUserProfile(me.ID, body.Name, body.Phone, body.Email, body.Dept)
		if !ok {
			writeAPIError(w, http.StatusNotFound, "NOT_FOUND", "user gone")
			return
		}
		writeEnvelope(w, http.StatusOK, updated)
	}
}

// ── Avatar ──

func meAvatarGet(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		me, _ := currentUser(r)
		mime, data, ok := d.Store.GetAvatar(me.ID)
		if !ok {
			writeAPIError(w, http.StatusNotFound, "NO_AVATAR", "no avatar set")
			return
		}
		w.Header().Set("Content-Type", mime)
		w.Header().Set("Cache-Control", "no-store")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(data)
	}
}

func meAvatarUpload(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		me, _ := currentUser(r)
		if err := r.ParseMultipartForm(maxAvatarForm); err != nil {
			writeAPIError(w, http.StatusBadRequest, "FORM_PARSE", "multipart parse failed")
			return
		}
		f, header, err := r.FormFile("file")
		if err != nil {
			writeAPIError(w, http.StatusBadRequest, "FILE_REQUIRED", "file required")
			return
		}
		defer f.Close()

		mime := header.Header.Get("Content-Type")
		if mime != "image/jpeg" && mime != "image/png" && mime != "image/webp" {
			writeAPIError(w, http.StatusUnsupportedMediaType, "BAD_MIME", "only image/jpeg|png|webp")
			return
		}
		if header.Size > maxAvatarBytes {
			writeAPIError(w, http.StatusRequestEntityTooLarge, "TOO_LARGE", "avatar must be <= 2MB")
			return
		}

		buf, err := io.ReadAll(io.LimitReader(f, maxAvatarBytes+1))
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "READ_FAILED", "read failed")
			return
		}
		if int64(len(buf)) > maxAvatarBytes {
			writeAPIError(w, http.StatusRequestEntityTooLarge, "TOO_LARGE", "avatar must be <= 2MB")
			return
		}

		if !d.Store.SetAvatar(me.ID, mime, buf) {
			writeAPIError(w, http.StatusNotFound, "NOT_FOUND", "user gone")
			return
		}
		// 返回最新 user
		updated, _ := d.Store.LookupByAccount(me.Account)
		writeEnvelope(w, http.StatusOK, updated)
	}
}

func meAvatarDelete(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		me, _ := currentUser(r)
		d.Store.ClearAvatar(me.ID)
		updated, _ := d.Store.LookupByAccount(me.Account)
		writeEnvelope(w, http.StatusOK, updated)
	}
}

// ── Password & sessions ──

func mePasswordChange(d Deps) http.HandlerFunc {
	type req struct {
		OldPassword string `json:"oldPassword"`
		NewPassword string `json:"newPassword"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		me, _ := currentUser(r)
		var body req
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json")
			return
		}
		if len(body.NewPassword) < 6 {
			writeAPIError(w, http.StatusBadRequest, "VALIDATION_FAILED", "new password too short (>= 6)")
			return
		}
		if len(body.NewPassword) > 64 {
			writeAPIError(w, http.StatusBadRequest, "VALIDATION_FAILED", "new password too long (<= 64)")
			return
		}
		if body.OldPassword == body.NewPassword {
			writeAPIError(w, http.StatusBadRequest, "VALIDATION_FAILED", "新密码不能与当前密码相同")
			return
		}
		err := d.Store.ChangePassword(me.ID, body.OldPassword, body.NewPassword)
		if err != nil {
			if errors.Is(err, store.ErrBadPassword) {
				writeAPIError(w, http.StatusUnauthorized, "AUTH_BAD_PASSWORD", "当前密码不正确")
				return
			}
			if errors.Is(err, store.ErrUserNotFound) {
				writeAPIError(w, http.StatusNotFound, "NOT_FOUND", "user gone")
				return
			}
			writeAPIError(w, http.StatusInternalServerError, "INTERNAL", "change password failed")
			return
		}
		writeEnvelope(w, http.StatusOK, map[string]any{"ok": true})
	}
}

type sessionView struct {
	Token       string `json:"token"`
	DeviceLabel string `json:"deviceLabel"`
	IP          string `json:"ip"`
	UserAgent   string `json:"userAgent"`
	CreatedAt   string `json:"createdAt"`
	LastSeenAt  string `json:"lastSeenAt"`
	ExpiresAt   string `json:"expiresAt"`
	Current     bool   `json:"current"`
}

func meSessionsList(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		me, _ := currentUser(r)
		cur := currentToken(r)
		rows := d.Store.ListSessions(me.ID)
		out := make([]sessionView, 0, len(rows))
		for _, s := range rows {
			out = append(out, sessionView{
				Token:       s.Token,
				DeviceLabel: s.DeviceLabel,
				IP:          s.IP,
				UserAgent:   s.UserAgent,
				CreatedAt:   s.CreatedAt.UTC().Format(time.RFC3339),
				LastSeenAt:  s.LastSeenAt.UTC().Format(time.RFC3339),
				ExpiresAt:   s.ExpiresAt.UTC().Format(time.RFC3339),
				Current:     s.Token == cur && cur != "",
			})
		}
		writeEnvelope(w, http.StatusOK, out)
	}
}

func meSessionDelete(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		me, _ := currentUser(r)
		token := chi.URLParam(r, "token")
		if token == "" {
			writeAPIError(w, http.StatusBadRequest, "VALIDATION_FAILED", "token required")
			return
		}
		if err := d.Store.RevokeSession(me.ID, token); err != nil {
			if errors.Is(err, store.ErrUserNotFound) {
				writeAPIError(w, http.StatusNotFound, "NOT_FOUND", "session not found")
				return
			}
			writeAPIError(w, http.StatusInternalServerError, "INTERNAL", "revoke failed")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

func meSessionsDeleteOthers(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		me, _ := currentUser(r)
		cur := currentToken(r)
		n, err := d.Store.RevokeOtherSessions(me.ID, cur)
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "INTERNAL", "revoke others failed")
			return
		}
		writeEnvelope(w, http.StatusOK, map[string]any{"revoked": n})
	}
}

