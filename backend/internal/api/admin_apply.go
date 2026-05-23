// Admin-apply API — used by the user-side admin-apply page.
//
// Routes (mounted under /api/v1/me, requireAuth):
//   GET    /admin-apply/status   latest application of current user, or {status:"none"}
//   POST   /admin-apply          create  body: {scope, reason, contact}
//   DELETE /admin-apply/mine     withdraw the user's pending application
package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/voiceguardian/backend/internal/store"
)

const (
	maxAdminApplyReason  = 500
	maxAdminApplyContact = 80
)

type adminApplyBody struct {
	Scope   string `json:"scope"`
	Reason  string `json:"reason"`
	Contact string `json:"contact"`
}

func (b *adminApplyBody) clean() {
	b.Scope = strings.TrimSpace(b.Scope)
	b.Reason = strings.TrimSpace(b.Reason)
	b.Contact = strings.TrimSpace(b.Contact)
}

func (b adminApplyBody) validate() (int, string, string) {
	if b.Scope != "family" && b.Scope != "biz" {
		return http.StatusBadRequest, "VALIDATION_FAILED", "scope 仅支持 family / biz"
	}
	if b.Reason == "" {
		return http.StatusBadRequest, "VALIDATION_FAILED", "reason 必填"
	}
	if len([]rune(b.Reason)) > maxAdminApplyReason {
		return http.StatusBadRequest, "VALIDATION_FAILED", "reason 最多 500 字"
	}
	if b.Contact == "" {
		return http.StatusBadRequest, "VALIDATION_FAILED", "contact 必填"
	}
	if len([]rune(b.Contact)) > maxAdminApplyContact {
		return http.StatusBadRequest, "VALIDATION_FAILED", "contact 最多 80 字"
	}
	return 0, "", ""
}

func adminApplyMyStatus(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, ok := currentUser(r)
		if !ok {
			writeAPIError(w, http.StatusUnauthorized, "AUTH_REQUIRED", "missing auth context")
			return
		}
		a, found := d.Store.AdminApplyLatest(u.ID)
		if !found {
			writeEnvelope(w, http.StatusOK, map[string]any{"status": "none"})
			return
		}
		writeEnvelope(w, http.StatusOK, a)
	}
}

func adminApplySubmit(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, ok := currentUser(r)
		if !ok {
			writeAPIError(w, http.StatusUnauthorized, "AUTH_REQUIRED", "missing auth context")
			return
		}
		var body adminApplyBody
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json")
			return
		}
		body.clean()
		if status, code, msg := body.validate(); status != 0 {
			writeAPIError(w, status, code, msg)
			return
		}
		a, err := d.Store.AdminApplyCreate(u.ID, body.Scope, body.Reason, body.Contact)
		if err != nil {
			if errors.Is(err, store.ErrAdminApplyPendingExists) {
				writeAPIError(w, http.StatusConflict, "ADMIN_APPLY_PENDING", "已存在待审核申请，请等待结果或撤回后再试")
				return
			}
			writeAPIError(w, http.StatusInternalServerError, "INTERNAL", "create failed")
			return
		}
		writeEnvelope(w, http.StatusCreated, a)
	}
}

func adminApplyWithdraw(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, ok := currentUser(r)
		if !ok {
			writeAPIError(w, http.StatusUnauthorized, "AUTH_REQUIRED", "missing auth context")
			return
		}
		if err := d.Store.AdminApplyWithdrawPending(u.ID); err != nil {
			if errors.Is(err, store.ErrAdminApplyNotFound) {
				writeAPIError(w, http.StatusNotFound, "NOT_FOUND", "无待撤回的申请")
				return
			}
			writeAPIError(w, http.StatusInternalServerError, "INTERNAL", "withdraw failed")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}
