// Managed-users store — backed by PostgreSQL.
//
// Tenant-scoped roster of organization members maintained by family-admin /
// admin pages. Distinct from auth_users: this table holds the *business* role
// (admin / operator / viewer) of someone the tenant has registered, while
// auth_users holds login identities (family / biz / family_admin / sysadmin).
// A future enhancement may link the two via an additional auth_user_id column.
package store

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

// ErrManagedUserNotFound signals the row was not in this tenant.
var ErrManagedUserNotFound = errors.New("managed user not found")

// ManagedUser is one tenant member.
type ManagedUser struct {
	ID        string    `json:"id"`
	TenantID  string    `json:"tenantId,omitempty"`
	Name      string    `json:"name"`
	Role      string    `json:"role"` // admin | operator | viewer
	Dept      string    `json:"dept"`
	Email     string    `json:"email"`
	Status    string    `json:"status"` // active | review | suspended
	Last      string    `json:"last"`
	CreatedBy string    `json:"createdBy,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}

const managedUserColumns = `id, tenant_id, name, role, dept, email, status, last_seen, created_by, created_at`

func scanManagedUser(row pgx.Row) (ManagedUser, error) {
	var u ManagedUser
	err := row.Scan(&u.ID, &u.TenantID, &u.Name, &u.Role, &u.Dept,
		&u.Email, &u.Status, &u.Last, &u.CreatedBy, &u.CreatedAt)
	return u, err
}

// ManagedUserList returns members of the given tenant.
func (s *Store) ManagedUserList(tenantID string) []ManagedUser {
	const q = `SELECT ` + managedUserColumns + `
	             FROM managed_users
	            WHERE tenant_id = $1
	            ORDER BY created_at DESC`
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	rows, err := s.pool.Query(ctx, q, tenantID)
	if err != nil {
		return []ManagedUser{}
	}
	defer rows.Close()
	out := []ManagedUser{}
	for rows.Next() {
		u, err := scanManagedUser(rows)
		if err != nil {
			return out
		}
		out = append(out, u)
	}
	return out
}

func normalizeManagedRole(role string) string {
	switch strings.TrimSpace(role) {
	case "admin", "operator", "viewer":
		return role
	}
	return "viewer"
}

func normalizeManagedStatus(status string) string {
	switch strings.TrimSpace(status) {
	case "active", "review", "suspended":
		return status
	}
	return "active"
}

// ManagedUserCreate inserts a new tenant member.
func (s *Store) ManagedUserCreate(tenantID, createdBy, name, role, dept, email, status string) (ManagedUser, error) {
	u := ManagedUser{
		ID:        "mu_" + randomID(),
		TenantID:  tenantID,
		Name:      strings.TrimSpace(name),
		Role:      normalizeManagedRole(role),
		Dept:      strings.TrimSpace(dept),
		Email:     strings.TrimSpace(email),
		Status:    normalizeManagedStatus(status),
		Last:      "刚刚",
		CreatedBy: createdBy,
	}
	const q = `INSERT INTO managed_users
	             (id, tenant_id, name, role, dept, email, status, last_seen, created_by)
	           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	           RETURNING created_at`
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := s.pool.QueryRow(ctx, q,
		u.ID, u.TenantID, u.Name, u.Role, u.Dept, u.Email, u.Status, u.Last, u.CreatedBy,
	).Scan(&u.CreatedAt); err != nil {
		return ManagedUser{}, err
	}
	return u, nil
}

// ManagedUserUpdate edits an existing row constrained to the caller's tenant.
func (s *Store) ManagedUserUpdate(tenantID, id, name, role, dept, email, status string) (ManagedUser, error) {
	const q = `UPDATE managed_users
	              SET name = $3, role = $4, dept = $5, email = $6, status = $7
	            WHERE id = $1 AND tenant_id = $2
	          RETURNING ` + managedUserColumns
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	u, err := scanManagedUser(s.pool.QueryRow(ctx, q,
		id, tenantID,
		strings.TrimSpace(name), normalizeManagedRole(role), strings.TrimSpace(dept),
		strings.TrimSpace(email), normalizeManagedStatus(status),
	))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ManagedUser{}, ErrManagedUserNotFound
		}
		return ManagedUser{}, err
	}
	return u, nil
}

// ManagedUserDelete removes a row constrained to the caller's tenant.
func (s *Store) ManagedUserDelete(tenantID, id string) error {
	const q = `DELETE FROM managed_users WHERE id = $1 AND tenant_id = $2`
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	tag, err := s.pool.Exec(ctx, q, id, tenantID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrManagedUserNotFound
	}
	return nil
}
