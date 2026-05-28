// Package api wires HTTP endpoints onto chi.
package api

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/voiceguardian/backend/internal/engine"
	"github.com/voiceguardian/backend/internal/feed"
	"github.com/voiceguardian/backend/internal/store"
)

// Deps bundles handler dependencies — passed by value, share-by-pointer.
type Deps struct {
	Logger  *slog.Logger
	Store   *store.Store
	Hub     *feed.Hub
	Engine  *engine.Engine
	Sampler *Sampler
}

// NewRouter returns a chi router with /api/v1/* mounted.
func NewRouter(d Deps) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(loggingMiddleware(d.Logger))
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(30 * time.Second))
	r.Use(corsMiddleware)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", health)
		r.Get("/stats", statsHandler(d))
		r.Get("/defcon", defconGet(d))
		r.Post("/defcon", defconSet(d))
		r.Get("/feed", feedRecent(d))
		r.Get("/feed/stream", feedStream(d))
		r.Get("/threats", threatsActive(d))
		r.Post("/analyze", analyzeCall(d))

		r.Route("/warroom", func(r chi.Router) {
			r.Get("/overview", warroomOverview(d))
			r.Get("/voiceprint/latest", warroomLatestVoiceprint(d))
		})

		// Auth (无需鉴权) — /me/avatar 是 GET 图片资源，避免 fetch 加 Authorization 时的 CORS 复杂度
		r.Post("/auth/login", authLogin(d))
		r.Post("/auth/register", authRegister(d))
		r.Post("/auth/refresh", authRefresh(d))
		r.Post("/auth/logout", authLogout(d))

		r.Route("/ops", func(r chi.Router) {
			r.Get("/health", opsHealth(d))
			r.Get("/ping", opsPing)
			r.Get("/info", opsInfo(d))
			r.Get("/series", opsSeries(d))
		})

		r.Route("/me", func(r chi.Router) {
			r.Use(func(next http.Handler) http.Handler { return requireAuth(d, next) })
			r.Get("/", meGet(d))
			r.Put("/", meUpdate(d))
			r.Get("/avatar", meAvatarGet(d))
			r.Put("/avatar", meAvatarUpload(d))
			r.Delete("/avatar", meAvatarDelete(d))
			r.Get("/credentials", credList(d))
			r.Post("/credentials/{kind}", credSubmit(d))
			r.Delete("/credentials/{kind}", credDelete(d))
			r.Post("/credentials/{kind}/upload", credUpload(d))
			r.Delete("/credentials/{kind}/photos/{slot}", credPhotoDelete(d))
			r.Get("/identity-modes", identityModesGet(d))
			r.Patch("/identity-modes", identityModesSet(d))

			r.Get("/emergency-contacts", emergencyContactsList(d))
			r.Post("/emergency-contacts", emergencyContactsCreate(d))
			r.Put("/emergency-contacts/{id}", emergencyContactsUpdate(d))
			r.Delete("/emergency-contacts/{id}", emergencyContactsDelete(d))

			r.Get("/whitelist", whitelistList(d))
			r.Post("/whitelist", whitelistCreate(d))
			r.Put("/whitelist/{id}", whitelistUpdate(d))
			r.Delete("/whitelist/{id}", whitelistDelete(d))

			r.Put("/password", mePasswordChange(d))
			r.Get("/sessions", meSessionsList(d))
			r.Delete("/sessions/others", meSessionsDeleteOthers(d))
			r.Delete("/sessions/{token}", meSessionDelete(d))
		})

		r.Group(func(r chi.Router) {
			r.Use(func(next http.Handler) http.Handler { return requireAuth(d, next) })
			r.Get("/admin-apply/status", adminApplyMyStatus(d))
			r.Post("/admin-apply", adminApplySubmit(d))
			r.Delete("/admin-apply/mine", adminApplyWithdraw(d))

			r.Get("/blacklist", blacklistList(d))
			r.Post("/blacklist", blacklistCreate(d))
			r.Put("/blacklist/{id}", blacklistUpdate(d))
			r.Delete("/blacklist/{id}", blacklistDelete(d))
			r.Get("/blacklist/export", blacklistExport(d))
			r.Post("/blacklist/import", blacklistImport(d))

			r.Get("/users", usersList(d))
			r.Post("/users", usersCreate(d))
			r.Put("/users/{id}", usersUpdate(d))
			r.Delete("/users/{id}", usersDelete(d))

			r.Get("/appeals", appealsList(d))
			r.Get("/appeals/all", appealsListAll(d))
			r.Post("/appeals", appealsCreate(d))
			r.Put("/appeals/{id}/status", appealsSetStatus(d))
		})
	})

	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		writeAPIError(w, http.StatusNotFound, "NOT_FOUND", "route not found: "+r.URL.Path)
	})

	return r
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Last-Event-ID, X-Device-Label")
		w.Header().Set("Access-Control-Expose-Headers", "X-Request-Id")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func loggingMiddleware(log *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
			next.ServeHTTP(ww, r)
			log.Info("http",
				"method", r.Method,
				"path", r.URL.Path,
				"status", ww.Status(),
				"bytes", ww.BytesWritten(),
				"dur_ms", time.Since(start).Milliseconds(),
				"rid", middleware.GetReqID(r.Context()),
			)
		})
	}
}
