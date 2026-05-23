// Identity credentials API — used by the family identity page.
//
// Routes (mounted under /api/v1/me):
//   GET    /credentials                  list all
//   POST   /credentials/{kind}           submit value (json: {value, verified?})
//   DELETE /credentials/{kind}           remove
//   POST   /credentials/{kind}/upload    upload one photo
//                                        multipart: file=<file>, slot=<face|emblem|main>
//   DELETE /credentials/{kind}/photos/{slot}
//   GET    /identity-modes               list toggles
//   PATCH  /identity-modes               body: { items: [{key, enabled}, ...] }
//
// Demo only: no auth, single user "me", in-memory storage. Photos are stored
// as base64 data URLs so the frontend can re-render previews after refresh.
package api

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/voiceguardian/backend/internal/store"
)

const (
	maxPhotoBytes = 5 * 1024 * 1024
	maxFormBytes  = 8 * 1024 * 1024
)

// envelope is the {data, meta?} shape consumed by lib/api.ts request/requestList.
type envelope struct {
	Data any `json:"data"`
}

func writeEnvelope(w http.ResponseWriter, status int, data any) {
	writeJSON(w, status, envelope{Data: data})
}

func writeAPIError(w http.ResponseWriter, status int, code, msg string) {
	writeJSON(w, status, map[string]any{
		"error": map[string]any{"code": code, "message": msg},
	})
}

func validKind(k string) bool {
	_, ok := store.CredKinds[k]
	return ok
}

func credList(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		writeEnvelope(w, http.StatusOK, d.Store.CredList())
	}
}

func credSubmit(d Deps) http.HandlerFunc {
	type req struct {
		Value    string `json:"value"`
		Verified bool   `json:"verified"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		kind := chi.URLParam(r, "kind")
		if !validKind(kind) {
			writeAPIError(w, http.StatusBadRequest, "INVALID_KIND", "unknown credential kind")
			return
		}
		var body req
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json")
			return
		}
		if strings.TrimSpace(body.Value) == "" {
			writeAPIError(w, http.StatusBadRequest, "VALUE_REQUIRED", "value required")
			return
		}
		c := d.Store.CredSubmit(kind, body.Value, body.Verified)
		writeEnvelope(w, http.StatusOK, c)
	}
}

func credDelete(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		kind := chi.URLParam(r, "kind")
		if !validKind(kind) {
			writeAPIError(w, http.StatusBadRequest, "INVALID_KIND", "unknown credential kind")
			return
		}
		if !d.Store.CredDelete(kind) {
			writeAPIError(w, http.StatusNotFound, "NOT_FOUND", "credential not found")
			return
		}
		writeEnvelope(w, http.StatusOK, map[string]any{"ok": true})
	}
}

func credUpload(d Deps) http.HandlerFunc {
	allowedSlots := map[string]struct{}{"face": {}, "emblem": {}, "main": {}}
	return func(w http.ResponseWriter, r *http.Request) {
		kind := chi.URLParam(r, "kind")
		if !validKind(kind) {
			writeAPIError(w, http.StatusBadRequest, "INVALID_KIND", "unknown credential kind")
			return
		}
		if err := r.ParseMultipartForm(maxFormBytes); err != nil {
			writeAPIError(w, http.StatusBadRequest, "FORM_PARSE", "multipart parse failed")
			return
		}
		slot := strings.TrimSpace(r.FormValue("slot"))
		if _, ok := allowedSlots[slot]; !ok {
			writeAPIError(w, http.StatusBadRequest, "INVALID_SLOT", "slot must be face|emblem|main")
			return
		}
		f, header, err := r.FormFile("file")
		if err != nil {
			writeAPIError(w, http.StatusBadRequest, "FILE_REQUIRED", "file required")
			return
		}
		defer f.Close()

		mime := header.Header.Get("Content-Type")
		if mime != "image/jpeg" && mime != "image/png" {
			writeAPIError(w, http.StatusUnsupportedMediaType, "BAD_MIME", "only image/jpeg or image/png")
			return
		}
		if header.Size > maxPhotoBytes {
			writeAPIError(w, http.StatusRequestEntityTooLarge, "TOO_LARGE", "image must be <= 5MB")
			return
		}

		buf, err := io.ReadAll(io.LimitReader(f, maxPhotoBytes+1))
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "READ_FAILED", "read failed")
			return
		}
		if int64(len(buf)) > maxPhotoBytes {
			writeAPIError(w, http.StatusRequestEntityTooLarge, "TOO_LARGE", "image must be <= 5MB")
			return
		}

		photo := store.Photo{
			Slot:    slot,
			Name:    header.Filename,
			Size:    int64(len(buf)),
			MIME:    mime,
			DataURL: fmt.Sprintf("data:%s;base64,%s", mime, base64.StdEncoding.EncodeToString(buf)),
		}
		c := d.Store.CredAttachPhoto(kind, photo)
		writeEnvelope(w, http.StatusOK, c)
	}
}

func credPhotoDelete(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		kind := chi.URLParam(r, "kind")
		slot := chi.URLParam(r, "slot")
		if !validKind(kind) {
			writeAPIError(w, http.StatusBadRequest, "INVALID_KIND", "unknown credential kind")
			return
		}
		if !d.Store.CredRemovePhoto(kind, slot) {
			writeAPIError(w, http.StatusNotFound, "NOT_FOUND", "photo not found")
			return
		}
		c, _ := d.Store.CredGet(kind)
		writeEnvelope(w, http.StatusOK, c)
	}
}

func identityModesGet(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		writeEnvelope(w, http.StatusOK, d.Store.IdentityModes())
	}
}

func identityModesSet(d Deps) http.HandlerFunc {
	type req struct {
		Items []store.IdentityMode `json:"items"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		var body req
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json")
			return
		}
		writeEnvelope(w, http.StatusOK, d.Store.SetIdentityModes(body.Items))
	}
}
