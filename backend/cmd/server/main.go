// Voice Guardian backend — entry point.
//
// Provides REST + SSE endpoints powering the Threat Operations Console:
//   GET  /api/v1/health
//   GET  /api/v1/stats
//   GET  /api/v1/defcon
//   GET  /api/v1/feed
//   GET  /api/v1/feed/stream   (text/event-stream)
//   GET  /api/v1/threats
//   POST /api/v1/analyze
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"

	"github.com/voiceguardian/backend/internal/api"
	"github.com/voiceguardian/backend/internal/db"
	"github.com/voiceguardian/backend/internal/engine"
	"github.com/voiceguardian/backend/internal/feed"
	"github.com/voiceguardian/backend/internal/store"
)

func main() {
	addr := flag.String("addr", ":8080", "listen address")
	flag.Parse()

	// Best-effort load of backend/.env (relative to CWD when run via `go run` from
	// repo root or backend/). Missing file is fine — env vars from the shell win.
	for _, p := range []string{".env", "backend/.env", "../.env"} {
		if err := godotenv.Load(p); err == nil {
			break
		}
	}

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		fmt.Fprintln(os.Stderr, "DATABASE_URL is not set")
		fmt.Fprintln(os.Stderr, "  example: postgres://voiceguardian:dev@localhost:5432/voiceguardian?sslmode=disable")
		os.Exit(1)
	}
	dbCtx, dbCancel := context.WithTimeout(context.Background(), 15*time.Second)
	pool, err := db.Open(dbCtx, dsn)
	dbCancel()
	if err != nil {
		logger.Error("database open failed", "err", err)
		os.Exit(1)
	}
	defer pool.Close()
	logger.Info("database connected")

	st := store.New(pool)
	migCtx, migCancel := context.WithTimeout(context.Background(), 15*time.Second)
	if err := st.MigrateLegacyDemoTenant(migCtx); err != nil {
		migCancel()
		logger.Error("legacy tenant backfill failed", "err", err)
		os.Exit(1)
	}
	migCancel()
	seedCtx, seedCancel := context.WithTimeout(context.Background(), 10*time.Second)
	if err := st.SeedDemoUsers(seedCtx); err != nil {
		seedCancel()
		logger.Error("seed demo users failed", "err", err)
		os.Exit(1)
	}
	seedCancel()
	hub := feed.NewHub(logger)
	eng := engine.New(logger)
	sampler := api.NewSampler()

	// Sampler tracks real CPU / memory / net for the dashboard's runtime panel.
	// The live feed and counters are driven by /api/v1/analyze — no synthetic
	// event generator runs in the background.
	simCtx, simCancel := context.WithCancel(context.Background())
	defer simCancel()
	sampler.Start(simCtx)

	router := api.NewRouter(api.Deps{
		Logger:  logger,
		Store:   st,
		Hub:     hub,
		Engine:  eng,
		Sampler: sampler,
	})

	srv := &http.Server{
		Addr:              *addr,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      0, // SSE streams; per-handler control instead
		IdleTimeout:       60 * time.Second,
	}

	// Graceful shutdown on SIGINT / SIGTERM.
	go func() {
		logger.Info("voice guardian backend listening", "addr", *addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("server error", "err", err)
			os.Exit(1)
		}
	}()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig
	logger.Info("shutdown signal received")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("graceful shutdown failed", "err", err)
	}
	logger.Info("bye")
}
