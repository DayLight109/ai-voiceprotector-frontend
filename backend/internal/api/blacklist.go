// Blacklist HTTP handlers — exposes /api/v1/blacklist CRUD plus CSV export
// and JSON bulk-import. Tenant scoping is derived from the authenticated user;
// global rows are visible to everyone but only sysadmin/admin may create/edit
// them via {"isGlobal": true} on create.
package api

import (
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/voiceguardian/backend/internal/store"
)

// canManageGlobalBlacklist returns true when the role is allowed to write rows
// that are visible across every tenant.
func canManageGlobalBlacklist(role string) bool {
	switch role {
	case "sysadmin", "admin":
		return true
	}
	return false
}

func blacklistList(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		me, ok := currentUser(r)
		if !ok {
			writeAPIError(w, http.StatusUnauthorized, "AUTH_REQUIRED", "login required")
			return
		}
		var items []store.BlacklistEntry
		switch r.URL.Query().Get("scope") {
		case "global":
			items = d.Store.BlacklistListGlobal()
		default:
			items = d.Store.BlacklistList(me.TenantID)
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"data": items,
			"meta": map[string]any{"total": len(items)},
		})
	}
}

func blacklistCreate(d Deps) http.HandlerFunc {
	type req struct {
		Number   string `json:"number"`
		Category string `json:"category"`
		Reason   string `json:"reason"`
		Risk     int    `json:"risk"`
		Source   string `json:"source"`
		IsGlobal bool   `json:"isGlobal"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		me, ok := currentUser(r)
		if !ok {
			writeAPIError(w, http.StatusUnauthorized, "AUTH_REQUIRED", "login required")
			return
		}
		var body req
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json")
			return
		}
		if strings.TrimSpace(body.Number) == "" {
			writeAPIError(w, http.StatusBadRequest, "NUMBER_REQUIRED", "number required")
			return
		}
		if body.IsGlobal && !canManageGlobalBlacklist(me.Role) {
			writeAPIError(w, http.StatusForbidden, "FORBIDDEN", "only sysadmin/admin may add global entries")
			return
		}
		e, err := d.Store.BlacklistCreate(me.TenantID, me.ID,
			body.Number, body.Category, body.Reason, body.Source, body.Risk, body.IsGlobal)
		if err != nil {
			if errors.Is(err, store.ErrBlacklistDuplicate) {
				writeAPIError(w, http.StatusConflict, "DUPLICATE", "number already on the blacklist")
				return
			}
			writeAPIError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
		writeEnvelope(w, http.StatusCreated, e)
	}
}

func blacklistUpdate(d Deps) http.HandlerFunc {
	type req struct {
		Number   string `json:"number"`
		Category string `json:"category"`
		Reason   string `json:"reason"`
		Risk     int    `json:"risk"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		me, ok := currentUser(r)
		if !ok {
			writeAPIError(w, http.StatusUnauthorized, "AUTH_REQUIRED", "login required")
			return
		}
		id := chi.URLParam(r, "id")
		var body req
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json")
			return
		}
		if strings.TrimSpace(body.Number) == "" {
			writeAPIError(w, http.StatusBadRequest, "NUMBER_REQUIRED", "number required")
			return
		}
		e, err := d.Store.BlacklistUpdate(me.TenantID, id,
			body.Number, body.Category, body.Reason, body.Risk,
			canManageGlobalBlacklist(me.Role))
		if err != nil {
			if errors.Is(err, store.ErrBlacklistNotFound) {
				writeAPIError(w, http.StatusNotFound, "NOT_FOUND", "entry not found")
				return
			}
			if errors.Is(err, store.ErrBlacklistDuplicate) {
				writeAPIError(w, http.StatusConflict, "DUPLICATE", "number already on the blacklist")
				return
			}
			writeAPIError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
		writeEnvelope(w, http.StatusOK, e)
	}
}

func blacklistDelete(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		me, ok := currentUser(r)
		if !ok {
			writeAPIError(w, http.StatusUnauthorized, "AUTH_REQUIRED", "login required")
			return
		}
		id := chi.URLParam(r, "id")
		if err := d.Store.BlacklistDelete(me.TenantID, id, canManageGlobalBlacklist(me.Role)); err != nil {
			if errors.Is(err, store.ErrBlacklistNotFound) {
				writeAPIError(w, http.StatusNotFound, "NOT_FOUND", "entry not found")
				return
			}
			writeAPIError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

func blacklistExport(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		me, ok := currentUser(r)
		if !ok {
			writeAPIError(w, http.StatusUnauthorized, "AUTH_REQUIRED", "login required")
			return
		}
		items := d.Store.BlacklistList(me.TenantID)
		w.Header().Set("Content-Type", "text/csv; charset=utf-8")
		w.Header().Set("Content-Disposition", `attachment; filename="blacklist.csv"`)
		w.Write([]byte{0xEF, 0xBB, 0xBF})
		cw := csv.NewWriter(w)
		_ = cw.Write([]string{"number", "category", "reason", "risk", "source", "isGlobal", "createdAt"})
		for _, e := range items {
			_ = cw.Write([]string{
				e.Number, e.Category, e.Reason,
				fmt.Sprintf("%d", e.Risk), e.Source,
				fmt.Sprintf("%t", e.IsGlobal),
				e.CreatedAt.Format("2006-01-02 15:04:05"),
			})
		}
		cw.Flush()
	}
}

func blacklistImport(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		me, ok := currentUser(r)
		if !ok {
			writeAPIError(w, http.StatusUnauthorized, "AUTH_REQUIRED", "login required")
			return
		}
		var items []store.BlacklistEntry
		if err := json.NewDecoder(r.Body).Decode(&items); err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json")
			return
		}
		isGlobal := false
		if len(items) > 0 && items[0].IsGlobal {
			isGlobal = true
		}
		if isGlobal && !canManageGlobalBlacklist(me.Role) {
			writeAPIError(w, http.StatusForbidden, "FORBIDDEN", "only sysadmin/admin may import global entries")
			return
		}
		imported, skipped, err := d.Store.BlacklistBulkInsert(me.TenantID, me.ID, items, isGlobal)
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
		writeEnvelope(w, http.StatusOK, map[string]any{
			"imported": imported,
			"skipped":  skipped,
		})
	}
}
