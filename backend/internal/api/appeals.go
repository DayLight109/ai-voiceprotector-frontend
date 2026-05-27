// Appeals API — used by the family/biz appeal & report page.
//
// Routes (mounted under /api/v1, requireAuth):
//   GET    /appeals                  list (current user)
//   POST   /appeals                  create  body: {type, number, reason}
//   PUT    /appeals/{id}/status      update status  body: {status}
package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/voiceguardian/backend/internal/store"
)

const (
	maxAppealNumber = 32
	maxAppealReason = 1000
)

var (
	validAppealTypes    = map[string]struct{}{"误判申诉": {}, "号码举报": {}}
	validAppealStatuses = map[string]struct{}{"处理中": {}, "已通过": {}, "已驳回": {}}
)

type appealCreateBody struct {
	Type   string `json:"type"`
	Number string `json:"number"`
	Reason string `json:"reason"`
}

type appealStatusBody struct {
	Status string `json:"status"`
}

func (b *appealCreateBody) clean() {
	b.Type = strings.TrimSpace(b.Type)
	b.Number = strings.TrimSpace(b.Number)
	b.Reason = strings.TrimSpace(b.Reason)
}

func (b appealCreateBody) validate() (int, string, string) {
	if _, ok := validAppealTypes[b.Type]; !ok {
		return http.StatusBadRequest, "VALIDATION_FAILED", "type 必须为 误判申诉 或 号码举报"
	}
	if b.Number == "" {
		return http.StatusBadRequest, "VALIDATION_FAILED", "number 必填"
	}
	if len(b.Number) > maxAppealNumber {
		return http.StatusBadRequest, "VALIDATION_FAILED", "number 过长"
	}
	if b.Reason == "" {
		return http.StatusBadRequest, "VALIDATION_FAILED", "reason 必填"
	}
	if len([]rune(b.Reason)) > maxAppealReason {
		return http.StatusBadRequest, "VALIDATION_FAILED", "reason 最多 1000 字"
	}
	return 0, "", ""
}

func appealsList(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, ok := currentUser(r)
		if !ok {
			writeAPIError(w, http.StatusUnauthorized, "AUTH_REQUIRED", "missing auth context")
			return
		}
		writeEnvelope(w, http.StatusOK, d.Store.AppealsList(u.ID))
	}
}

func appealsCreate(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, ok := currentUser(r)
		if !ok {
			writeAPIError(w, http.StatusUnauthorized, "AUTH_REQUIRED", "missing auth context")
			return
		}
		var body appealCreateBody
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json")
			return
		}
		body.clean()
		if status, code, msg := body.validate(); status != 0 {
			writeAPIError(w, status, code, msg)
			return
		}
		a, err := d.Store.AppealsCreate(u.ID, body.Type, body.Number, body.Reason)
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "INTERNAL", "create failed")
			return
		}
		writeEnvelope(w, http.StatusCreated, a)
	}
}

func appealsSetStatus(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, ok := currentUser(r)
		if !ok {
			writeAPIError(w, http.StatusUnauthorized, "AUTH_REQUIRED", "missing auth context")
			return
		}
		id := chi.URLParam(r, "id")
		if id == "" {
			writeAPIError(w, http.StatusBadRequest, "VALIDATION_FAILED", "id 必填")
			return
		}
		var body appealStatusBody
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json")
			return
		}
		body.Status = strings.TrimSpace(body.Status)
		if _, ok := validAppealStatuses[body.Status]; !ok {
			writeAPIError(w, http.StatusBadRequest, "VALIDATION_FAILED", "status 取值无效")
			return
		}
		a, err := d.Store.AppealsSetStatus(u.ID, id, body.Status)
		if err != nil {
			if errors.Is(err, store.ErrAppealNotFound) {
				writeAPIError(w, http.StatusNotFound, "NOT_FOUND", "appeal not found")
				return
			}
			writeAPIError(w, http.StatusInternalServerError, "INTERNAL", "update failed")
			return
		}
		writeEnvelope(w, http.StatusOK, a)
	}
}
