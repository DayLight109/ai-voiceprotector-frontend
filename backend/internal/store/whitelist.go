// Whitelist store — backed by PostgreSQL.
//
// Whitelists are tenant-scoped (the family side and the business side each
// have one shared list). Phone uniqueness is enforced per tenant by the
// unique index on (tenant_id, phone) declared in internal/db/db.go.
// created_by records the auth user that wrote the row for audit; it does not
// gate visibility.
package store

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

// ErrWhitelistDuplicate signals the same phone is already on file in this tenant.
var ErrWhitelistDuplicate = errors.New("whitelist phone duplicate")

// ErrWhitelistNotFound signals the entry id was not found in this tenant.
var ErrWhitelistNotFound = errors.New("whitelist entry not found")

// WhitelistEntry is one entry in a tenant's whitelist.
type WhitelistEntry struct {
	ID        string    `json:"id"`
	TenantID  string    `json:"tenantId"`
	Phone     string    `json:"phone"`
	Name      string    `json:"name"`
	Relation  string    `json:"relation"`
	CreatedBy string    `json:"createdBy"`
	CreatedAt time.Time `json:"createdAt"`
}

// WhitelistList returns the tenant's whitelist ordered by creation time.
func (s *Store) WhitelistList(tenantID string) []WhitelistEntry {
	const q = `SELECT id, tenant_id, phone, name, relation, created_by, created_at
	             FROM whitelist_entries
	            WHERE tenant_id = $1
	            ORDER BY created_at ASC`
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	rows, err := s.pool.Query(ctx, q, tenantID)
	if err != nil {
		return []WhitelistEntry{}
	}
	defer rows.Close()
	out := []WhitelistEntry{}
	for rows.Next() {
		var e WhitelistEntry
		if err := rows.Scan(&e.ID, &e.TenantID, &e.Phone, &e.Name, &e.Relation, &e.CreatedBy, &e.CreatedAt); err != nil {
			return out
		}
		out = append(out, e)
	}
	return out
}

// WhitelistCreate inserts a new whitelist entry into the tenant's list.
// createdBy records which auth user wrote the row.
func (s *Store) WhitelistCreate(tenantID, createdBy, phone, name, relation string) (WhitelistEntry, error) {
	phone = strings.TrimSpace(phone)
	name = strings.TrimSpace(name)
	relation = strings.TrimSpace(relation)

	e := WhitelistEntry{
		ID:        "wl_" + randomID(),
		TenantID:  tenantID,
		Phone:     phone,
		Name:      name,
		Relation:  relation,
		CreatedBy: createdBy,
	}
	const q = `INSERT INTO whitelist_entries (id, user_id, tenant_id, phone, name, relation, created_by)
	           VALUES ($1, $2, $3, $4, $5, $6, $7)
	           RETURNING created_at`
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := s.pool.QueryRow(ctx, q, e.ID, createdBy, e.TenantID, e.Phone, e.Name, e.Relation, e.CreatedBy).Scan(&e.CreatedAt); err != nil {
		if isUniqueViolation(err) {
			return WhitelistEntry{}, ErrWhitelistDuplicate
		}
		return WhitelistEntry{}, err
	}
	return e, nil
}

// WhitelistUpdate overwrites phone/name/relation on the tenant's entry identified by id.
func (s *Store) WhitelistUpdate(tenantID, id, phone, name, relation string) (WhitelistEntry, error) {
	phone = strings.TrimSpace(phone)
	name = strings.TrimSpace(name)
	relation = strings.TrimSpace(relation)

	const q = `UPDATE whitelist_entries
	              SET phone = $3, name = $4, relation = $5
	            WHERE tenant_id = $1 AND id = $2
	        RETURNING id, tenant_id, phone, name, relation, created_by, created_at`
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var e WhitelistEntry
	err := s.pool.QueryRow(ctx, q, tenantID, id, phone, name, relation).
		Scan(&e.ID, &e.TenantID, &e.Phone, &e.Name, &e.Relation, &e.CreatedBy, &e.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return WhitelistEntry{}, ErrWhitelistNotFound
		}
		if isUniqueViolation(err) {
			return WhitelistEntry{}, ErrWhitelistDuplicate
		}
		return WhitelistEntry{}, err
	}
	return e, nil
}

// WhitelistDelete removes the tenant's entry by id.
func (s *Store) WhitelistDelete(tenantID, id string) error {
	const q = `DELETE FROM whitelist_entries WHERE tenant_id = $1 AND id = $2`
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	tag, err := s.pool.Exec(ctx, q, tenantID, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrWhitelistNotFound
	}
	return nil
}
