// Managed-users HTTP handlers — exposes /api/v1/users CRUD for the
// family-admin / admin "members management" page. Tenant scoping is derived
// from the authenticated user.
package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/voiceguardian/backend/internal/store"
)

// canManageUsers returns true when the caller's role is allowed to maintain
// the tenant's roster.
func canManageUsers(role string) bool {
	switch role {
	case "family_admin", "admin", "sysadmin":
		return true
	}
	return false
}

func usersList(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		me, ok := currentUser(r)
		if !ok {
			writeAPIError(w, http.StatusUnauthorized, "AUTH_REQUIRED", "login required")
			return
		}
		if !canManageUsers(me.Role) {
			writeAPIError(w, http.StatusForbidden, "FORBIDDEN", "only family-admin/admin/sysadmin may list members")
			return
		}
		items := d.Store.ManagedUserList(me.TenantID)
		writeJSON(w, http.StatusOK, map[string]any{
			"data": items,
			"meta": map[string]any{"total": len(items)},
		})
	}
}

type managedUserReq struct {
	Name   string `json:"name"`
	Role   string `json:"role"`
	Dept   string `json:"dept"`
	Email  string `json:"email"`
	Status string `json:"status"`
}

func usersCreate(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		me, ok := currentUser(r)
		if !ok {
			writeAPIError(w, http.StatusUnauthorized, "AUTH_REQUIRED", "login required")
			return
		}
		if !canManageUsers(me.Role) {
			writeAPIError(w, http.StatusForbidden, "FORBIDDEN", "only family-admin/admin/sysadmin may add members")
			return
		}
		var body managedUserReq
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json")
			return
		}
		if strings.TrimSpace(body.Name) == "" {
			writeAPIError(w, http.StatusBadRequest, "NAME_REQUIRED", "name required")
			return
		}
		u, err := d.Store.ManagedUserCreate(me.TenantID, me.ID,
			body.Name, body.Role, body.Dept, body.Email, body.Status)
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
		writeEnvelope(w, http.StatusCreated, u)
	}
}

func usersUpdate(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		me, ok := currentUser(r)
		if !ok {
			writeAPIError(w, http.StatusUnauthorized, "AUTH_REQUIRED", "login required")
			return
		}
		if !canManageUsers(me.Role) {
			writeAPIError(w, http.StatusForbidden, "FORBIDDEN", "only family-admin/admin/sysadmin may edit members")
			return
		}
		id := chi.URLParam(r, "id")
		var body managedUserReq
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json")
			return
		}
		if strings.TrimSpace(body.Name) == "" {
			writeAPIError(w, http.StatusBadRequest, "NAME_REQUIRED", "name required")
			return
		}
		u, err := d.Store.ManagedUserUpdate(me.TenantID, id,
			body.Name, body.Role, body.Dept, body.Email, body.Status)
		if err != nil {
			if errors.Is(err, store.ErrManagedUserNotFound) {
				writeAPIError(w, http.StatusNotFound, "NOT_FOUND", "member not found in this tenant")
				return
			}
			writeAPIError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
		writeEnvelope(w, http.StatusOK, u)
	}
}

func usersDelete(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		me, ok := currentUser(r)
		if !ok {
			writeAPIError(w, http.StatusUnauthorized, "AUTH_REQUIRED", "login required")
			return
		}
		if !canManageUsers(me.Role) {
			writeAPIError(w, http.StatusForbidden, "FORBIDDEN", "only family-admin/admin/sysadmin may remove members")
			return
		}
		id := chi.URLParam(r, "id")
		if err := d.Store.ManagedUserDelete(me.TenantID, id); err != nil {
			if errors.Is(err, store.ErrManagedUserNotFound) {
				writeAPIError(w, http.StatusNotFound, "NOT_FOUND", "member not found in this tenant")
				return
			}
			writeAPIError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}
