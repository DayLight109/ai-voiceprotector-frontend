// Whitelist API — used by the user-side protection page.
//
// Routes (mounted under /api/v1/me, requireAuth):
//   GET    /whitelist          list
//   POST   /whitelist          create  body: {phone, name?, relation?}
//   PUT    /whitelist/{id}     update  body: {phone, name?, relation?}
//   DELETE /whitelist/{id}     remove
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
	maxWhitelistName     = 32
	maxWhitelistPhone    = 20
	maxWhitelistRelation = 16
)

type whitelistBody struct {
	Phone    string `json:"phone"`
	Name     string `json:"name"`
	Relation string `json:"relation"`
}

func (b *whitelistBody) clean() {
	b.Phone = strings.TrimSpace(b.Phone)
	b.Name = strings.TrimSpace(b.Name)
	b.Relation = strings.TrimSpace(b.Relation)
}

func (b whitelistBody) validate() (int, string, string) {
	if b.Phone == "" {
		return http.StatusBadRequest, "VALIDATION_FAILED", "phone 必填"
	}
	if len(b.Phone) > maxWhitelistPhone {
		return http.StatusBadRequest, "VALIDATION_FAILED", "phone 最多 20 位"
	}
	if len([]rune(b.Name)) > maxWhitelistName {
		return http.StatusBadRequest, "VALIDATION_FAILED", "name 最多 32 字"
	}
	if len([]rune(b.Relation)) > maxWhitelistRelation {
		return http.StatusBadRequest, "VALIDATION_FAILED", "relation 最多 16 字"
	}
	return 0, "", ""
}

func whitelistList(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, ok := currentUser(r)
		if !ok {
			writeAPIError(w, http.StatusUnauthorized, "AUTH_REQUIRED", "missing auth context")
			return
		}
		writeEnvelope(w, http.StatusOK, d.Store.WhitelistList(u.ID))
	}
}

func whitelistCreate(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, ok := currentUser(r)
		if !ok {
			writeAPIError(w, http.StatusUnauthorized, "AUTH_REQUIRED", "missing auth context")
			return
		}
		var body whitelistBody
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json")
			return
		}
		body.clean()
		if status, code, msg := body.validate(); status != 0 {
			writeAPIError(w, status, code, msg)
			return
		}
		e, err := d.Store.WhitelistCreate(u.ID, body.Phone, body.Name, body.Relation)
		if err != nil {
			if errors.Is(err, store.ErrWhitelistDuplicate) {
				writeAPIError(w, http.StatusConflict, "WHITELIST_DUPLICATE", "该号码已在白名单")
				return
			}
			writeAPIError(w, http.StatusInternalServerError, "INTERNAL", "create failed")
			return
		}
		writeEnvelope(w, http.StatusCreated, e)
	}
}

func whitelistUpdate(d Deps) http.HandlerFunc {
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
		var body whitelistBody
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json")
			return
		}
		body.clean()
		if status, code, msg := body.validate(); status != 0 {
			writeAPIError(w, status, code, msg)
			return
		}
		e, err := d.Store.WhitelistUpdate(u.ID, id, body.Phone, body.Name, body.Relation)
		if err != nil {
			switch {
			case errors.Is(err, store.ErrWhitelistNotFound):
				writeAPIError(w, http.StatusNotFound, "NOT_FOUND", "entry not found")
			case errors.Is(err, store.ErrWhitelistDuplicate):
				writeAPIError(w, http.StatusConflict, "WHITELIST_DUPLICATE", "该号码已在白名单")
			default:
				writeAPIError(w, http.StatusInternalServerError, "INTERNAL", "update failed")
			}
			return
		}
		writeEnvelope(w, http.StatusOK, e)
	}
}

func whitelistDelete(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, ok := currentUser(r)
		if !ok {
			writeAPIError(w, http.StatusUnauthorized, "AUTH_REQUIRED", "missing auth context")
			return
		}
		id := chi.URLParam(r, "id")
		if err := d.Store.WhitelistDelete(u.ID, id); err != nil {
			if errors.Is(err, store.ErrWhitelistNotFound) {
				writeAPIError(w, http.StatusNotFound, "NOT_FOUND", "entry not found")
				return
			}
			writeAPIError(w, http.StatusInternalServerError, "INTERNAL", "delete failed")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}
