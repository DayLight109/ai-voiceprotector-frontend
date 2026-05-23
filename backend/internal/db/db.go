// Package db provides the PostgreSQL connection pool and startup DDL.
//
// The pool is created from DATABASE_URL (libpq-style URL). On Open the schema
// is brought up to date via idempotent CREATE TABLE IF NOT EXISTS statements
// — no external migration tool is required.
package db

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Open creates a pool, pings the database and applies idempotent DDL.
// The caller owns the pool and must Close it on shutdown.
func Open(ctx context.Context, dsn string) (*pgxpool.Pool, error) {
	if dsn == "" {
		return nil, errors.New("DATABASE_URL is empty")
	}
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("parse DATABASE_URL: %w", err)
	}
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("connect: %w", err)
	}
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping: %w", err)
	}
	if err := applySchema(ctx, pool); err != nil {
		pool.Close()
		return nil, fmt.Errorf("schema: %w", err)
	}
	return pool, nil
}

const schemaSQL = `
CREATE TABLE IF NOT EXISTS auth_users (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL DEFAULT 'tenant-demo',
    account         TEXT NOT NULL,
    name            TEXT NOT NULL DEFAULT '',
    phone           TEXT NOT NULL DEFAULT '',
    email           TEXT NOT NULL DEFAULT '',
    role            TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'active',
    dept            TEXT NOT NULL DEFAULT '',
    password_hash   TEXT NOT NULL,
    avatar_mime     TEXT NOT NULL DEFAULT '',
    avatar_data     BYTEA,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    password_updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS auth_users_account_uniq
    ON auth_users (lower(account));

CREATE TABLE IF NOT EXISTS auth_sessions (
    token         TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    kind          TEXT NOT NULL,
    device_label  TEXT NOT NULL DEFAULT '',
    ip            TEXT NOT NULL DEFAULT '',
    user_agent    TEXT NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at    TIMESTAMPTZ NOT NULL,
    last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx
    ON auth_sessions (user_id, kind, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS emergency_contacts (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    name        TEXT NOT NULL,
    phone       TEXT NOT NULL,
    relation    TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS emergency_contacts_user_phone_uniq
    ON emergency_contacts (user_id, phone);
CREATE INDEX IF NOT EXISTS emergency_contacts_user_idx
    ON emergency_contacts (user_id, created_at);

CREATE TABLE IF NOT EXISTS whitelist_entries (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    phone       TEXT NOT NULL,
    name        TEXT NOT NULL DEFAULT '',
    relation    TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS whitelist_entries_user_phone_uniq
    ON whitelist_entries (user_id, phone);
CREATE INDEX IF NOT EXISTS whitelist_entries_user_idx
    ON whitelist_entries (user_id, created_at);

CREATE TABLE IF NOT EXISTS admin_applications (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    scope       TEXT NOT NULL,
    reason      TEXT NOT NULL,
    contact     TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at  TIMESTAMPTZ,
    decided_by  TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS admin_applications_user_pending_uniq
    ON admin_applications (user_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS admin_applications_user_idx
    ON admin_applications (user_id, created_at DESC);
`

func applySchema(ctx context.Context, pool *pgxpool.Pool) error {
	ddlCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	_, err := pool.Exec(ddlCtx, schemaSQL)
	return err
}
