// Blacklist store — backed by PostgreSQL.
//
// Each entry is scoped either to a single tenant (tenant_id, is_global=false)
// or to the platform-wide global pool (tenant_id='', is_global=true).
// Uniqueness is enforced per-scope by the unique index on (tenant_id, number).
package store

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

// ErrBlacklistDuplicate signals the same number already exists in the same scope.
var ErrBlacklistDuplicate = errors.New("blacklist number duplicate")

// ErrBlacklistNotFound signals the entry id was not found in this scope.
var ErrBlacklistNotFound = errors.New("blacklist entry not found")

// BlacklistEntry is one tenant-scoped or global blacklist entry.
type BlacklistEntry struct {
	ID        string    `json:"id"`
	TenantID  string    `json:"tenantId,omitempty"`
	IsGlobal  bool      `json:"isGlobal"`
	Number    string    `json:"number"`
	Category  string    `json:"category"`
	Reason    string    `json:"reason"`
	Risk      int       `json:"risk"`
	Source    string    `json:"source"`
	CreatedBy string    `json:"createdBy,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}

const blacklistColumns = `id, tenant_id, is_global, number, category, reason, risk, source, created_by, created_at`

func scanBlacklist(row pgx.Row) (BlacklistEntry, error) {
	var e BlacklistEntry
	err := row.Scan(&e.ID, &e.TenantID, &e.IsGlobal, &e.Number, &e.Category,
		&e.Reason, &e.Risk, &e.Source, &e.CreatedBy, &e.CreatedAt)
	return e, err
}

// BlacklistList returns entries visible to the caller: global rows plus the
// caller's tenant rows. When tenantID is empty only global rows are returned.
func (s *Store) BlacklistList(tenantID string) []BlacklistEntry {
	const q = `SELECT ` + blacklistColumns + `
	             FROM blacklist_entries
	            WHERE is_global = true OR tenant_id = $1
	            ORDER BY created_at DESC`
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	rows, err := s.pool.Query(ctx, q, tenantID)
	if err != nil {
		return []BlacklistEntry{}
	}
	defer rows.Close()
	out := []BlacklistEntry{}
	for rows.Next() {
		e, err := scanBlacklist(rows)
		if err != nil {
			return out
		}
		out = append(out, e)
	}
	return out
}

// BlacklistListGlobal returns only the platform-wide global rows. Used by
// the sysadmin "global blacklist" page so tenant-private entries never leak
// into the public pool view.
func (s *Store) BlacklistListGlobal() []BlacklistEntry {
	const q = `SELECT ` + blacklistColumns + `
	             FROM blacklist_entries
	            WHERE is_global = true
	            ORDER BY created_at DESC`
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	rows, err := s.pool.Query(ctx, q)
	if err != nil {
		return []BlacklistEntry{}
	}
	defer rows.Close()
	out := []BlacklistEntry{}
	for rows.Next() {
		e, err := scanBlacklist(rows)
		if err != nil {
			return out
		}
		out = append(out, e)
	}
	return out
}

// BlacklistGet fetches a single entry the caller is allowed to see.
func (s *Store) BlacklistGet(tenantID, id string) (BlacklistEntry, error) {
	const q = `SELECT ` + blacklistColumns + `
	             FROM blacklist_entries
	            WHERE id = $1 AND (is_global = true OR tenant_id = $2)`
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	e, err := scanBlacklist(s.pool.QueryRow(ctx, q, id, tenantID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return BlacklistEntry{}, ErrBlacklistNotFound
		}
		return BlacklistEntry{}, err
	}
	return e, nil
}

// BlacklistCreate inserts an entry. When isGlobal is true the row is shared
// across all tenants; otherwise it lives only in the caller's tenant scope.
func (s *Store) BlacklistCreate(tenantID, createdBy, number, category, reason, source string, risk int, isGlobal bool) (BlacklistEntry, error) {
	number = strings.TrimSpace(number)
	category = strings.TrimSpace(category)
	reason = strings.TrimSpace(reason)
	source = strings.TrimSpace(source)
	if category == "" {
		category = "其他"
	}
	if source == "" {
		source = "手动"
	}
	if risk < 0 {
		risk = 0
	} else if risk > 100 {
		risk = 100
	}
	scope := tenantID
	if isGlobal {
		scope = ""
	}

	e := BlacklistEntry{
		ID:        "bl_" + randomID(),
		TenantID:  scope,
		IsGlobal:  isGlobal,
		Number:    number,
		Category:  category,
		Reason:    reason,
		Risk:      risk,
		Source:    source,
		CreatedBy: createdBy,
	}
	const q = `INSERT INTO blacklist_entries
	             (id, tenant_id, is_global, number, category, reason, risk, source, created_by)
	           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	           RETURNING created_at`
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := s.pool.QueryRow(ctx, q,
		e.ID, e.TenantID, e.IsGlobal, e.Number, e.Category, e.Reason, e.Risk, e.Source, e.CreatedBy,
	).Scan(&e.CreatedAt); err != nil {
		if isUniqueViolation(err) {
			return BlacklistEntry{}, ErrBlacklistDuplicate
		}
		return BlacklistEntry{}, err
	}
	return e, nil
}

// BlacklistUpdate overwrites mutable fields of an entry. Tenant rows can only
// be updated by callers in that tenant; global rows require canManageGlobal.
func (s *Store) BlacklistUpdate(tenantID, id, number, category, reason string, risk int, canManageGlobal bool) (BlacklistEntry, error) {
	number = strings.TrimSpace(number)
	category = strings.TrimSpace(category)
	reason = strings.TrimSpace(reason)
	if category == "" {
		category = "其他"
	}
	if risk < 0 {
		risk = 0
	} else if risk > 100 {
		risk = 100
	}

	const q = `UPDATE blacklist_entries
	              SET number = $3, category = $4, reason = $5, risk = $6
	            WHERE id = $1
	              AND (
	                    (is_global = false AND tenant_id = $2)
	                 OR (is_global = true  AND $7 = true)
	              )
	        RETURNING ` + blacklistColumns
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	e, err := scanBlacklist(s.pool.QueryRow(ctx, q, id, tenantID, number, category, reason, risk, canManageGlobal))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return BlacklistEntry{}, ErrBlacklistNotFound
		}
		if isUniqueViolation(err) {
			return BlacklistEntry{}, ErrBlacklistDuplicate
		}
		return BlacklistEntry{}, err
	}
	return e, nil
}

// BlacklistDelete removes an entry. Tenant rows can only be removed by callers
// in that tenant; global rows require canManageGlobal.
func (s *Store) BlacklistDelete(tenantID, id string, canManageGlobal bool) error {
	const q = `DELETE FROM blacklist_entries
	            WHERE id = $1
	              AND (
	                    (is_global = false AND tenant_id = $2)
	                 OR (is_global = true  AND $3 = true)
	              )`
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	tag, err := s.pool.Exec(ctx, q, id, tenantID, canManageGlobal)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrBlacklistNotFound
	}
	return nil
}

// BlacklistBulkInsert imports many rows in a single transaction. Rows whose
// (scope, number) already exists are skipped silently. Returns counts.
func (s *Store) BlacklistBulkInsert(tenantID, createdBy string, items []BlacklistEntry, isGlobal bool) (imported, skipped int, err error) {
	if len(items) == 0 {
		return 0, 0, nil
	}
	scope := tenantID
	if isGlobal {
		scope = ""
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, 0, err
	}
	defer tx.Rollback(ctx)

	const q = `INSERT INTO blacklist_entries
	             (id, tenant_id, is_global, number, category, reason, risk, source, created_by)
	           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	           ON CONFLICT (tenant_id, number) DO NOTHING`
	for _, it := range items {
		num := strings.TrimSpace(it.Number)
		if num == "" {
			skipped++
			continue
		}
		cat := strings.TrimSpace(it.Category)
		if cat == "" {
			cat = "其他"
		}
		src := strings.TrimSpace(it.Source)
		if src == "" {
			src = "手动"
		}
		risk := it.Risk
		if risk < 0 {
			risk = 0
		} else if risk > 100 {
			risk = 100
		}
		tag, e := tx.Exec(ctx, q,
			"bl_"+randomID(), scope, isGlobal, num, cat,
			strings.TrimSpace(it.Reason), risk, src, createdBy)
		if e != nil {
			return imported, skipped, e
		}
		if tag.RowsAffected() == 1 {
			imported++
		} else {
			skipped++
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return imported, skipped, err
	}
	return imported, skipped, nil
}
