// Emergency contacts API — used by the family settings page.
//
// Routes (mounted under /api/v1/me, requireAuth):
//   GET    /emergency-contacts          list
//   POST   /emergency-contacts          create  body: {name, phone, relation?}
//   PUT    /emergency-contacts/{id}     update  body: {name, phone, relation?}
//   DELETE /emergency-contacts/{id}     remove
//
// Demo only: in-memory storage, scoped per authenticated user.
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
	maxEmergencyName     = 32
	maxEmergencyPhone    = 20
	maxEmergencyRelation = 16
)

type emergencyContactBody struct {
	Name     string `json:"name"`
	Phone    string `json:"phone"`
	Relation string `json:"relation"`
}

func (b *emergencyContactBody) clean() {
	b.Name = strings.TrimSpace(b.Name)
	b.Phone = strings.TrimSpace(b.Phone)
	b.Relation = strings.TrimSpace(b.Relation)
}

func (b emergencyContactBody) validate() (int, string, string) {
	if b.Name == "" {
		return http.StatusBadRequest, "VALIDATION_FAILED", "name 必填"
	}
	if len([]rune(b.Name)) > maxEmergencyName {
		return http.StatusBadRequest, "VALIDATION_FAILED", "name 最多 32 字"
	}
	if b.Phone == "" {
		return http.StatusBadRequest, "VALIDATION_FAILED", "phone 必填"
	}
	if len(b.Phone) > maxEmergencyPhone {
		return http.StatusBadRequest, "VALIDATION_FAILED", "phone 最多 20 位"
	}
	if len([]rune(b.Relation)) > maxEmergencyRelation {
		return http.StatusBadRequest, "VALIDATION_FAILED", "relation 最多 16 字"
	}
	return 0, "", ""
}

func emergencyContactsList(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, ok := currentUser(r)
		if !ok {
			writeAPIError(w, http.StatusUnauthorized, "AUTH_REQUIRED", "missing auth context")
			return
		}
		writeEnvelope(w, http.StatusOK, d.Store.EmergencyList(u.ID))
	}
}

func emergencyContactsCreate(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, ok := currentUser(r)
		if !ok {
			writeAPIError(w, http.StatusUnauthorized, "AUTH_REQUIRED", "missing auth context")
			return
		}
		var body emergencyContactBody
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json")
			return
		}
		body.clean()
		if status, code, msg := body.validate(); status != 0 {
			writeAPIError(w, status, code, msg)
			return
		}
		ec, err := d.Store.EmergencyCreate(u.ID, body.Name, body.Phone, body.Relation)
		if err != nil {
			if errors.Is(err, store.ErrEmergencyContactDuplicate) {
				writeAPIError(w, http.StatusConflict, "EMERGENCY_CONTACT_DUPLICATE", "该号码已在紧急联系人列表")
				return
			}
			writeAPIError(w, http.StatusInternalServerError, "INTERNAL", "create failed")
			return
		}
		writeEnvelope(w, http.StatusCreated, ec)
	}
}

func emergencyContactsUpdate(d Deps) http.HandlerFunc {
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
		var body emergencyContactBody
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json")
			return
		}
		body.clean()
		if status, code, msg := body.validate(); status != 0 {
			writeAPIError(w, status, code, msg)
			return
		}
		ec, err := d.Store.EmergencyUpdate(u.ID, id, body.Name, body.Phone, body.Relation)
		if err != nil {
			switch {
			case errors.Is(err, store.ErrEmergencyContactNotFound):
				writeAPIError(w, http.StatusNotFound, "NOT_FOUND", "contact not found")
			case errors.Is(err, store.ErrEmergencyContactDuplicate):
				writeAPIError(w, http.StatusConflict, "EMERGENCY_CONTACT_DUPLICATE", "该号码已在紧急联系人列表")
			default:
				writeAPIError(w, http.StatusInternalServerError, "INTERNAL", "update failed")
			}
			return
		}
		writeEnvelope(w, http.StatusOK, ec)
	}
}

func emergencyContactsDelete(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, ok := currentUser(r)
		if !ok {
			writeAPIError(w, http.StatusUnauthorized, "AUTH_REQUIRED", "missing auth context")
			return
		}
		id := chi.URLParam(r, "id")
		if err := d.Store.EmergencyDelete(u.ID, id); err != nil {
			if errors.Is(err, store.ErrEmergencyContactNotFound) {
				writeAPIError(w, http.StatusNotFound, "NOT_FOUND", "contact not found")
				return
			}
			writeAPIError(w, http.StatusInternalServerError, "INTERNAL", "delete failed")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}
