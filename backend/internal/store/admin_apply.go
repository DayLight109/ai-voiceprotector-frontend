// Admin-application store — backed by PostgreSQL.
//
// One pending application per user is enforced by a partial unique index on
// (user_id) WHERE status = 'pending' declared in internal/db/db.go.
package store

import (
	"context"
	"errors"
	"strings"
	"time"
)

var (
	// ErrAdminApplyPendingExists signals the user already has a pending application.
	ErrAdminApplyPendingExists = errors.New("admin apply pending exists")
	// ErrAdminApplyNotFound signals no application matches.
	ErrAdminApplyNotFound = errors.New("admin apply not found")
)

// AdminApplyStatus is the lifecycle of an application.
type AdminApplyStatus string

const (
	AdminApplyPending  AdminApplyStatus = "pending"
	AdminApplyApproved AdminApplyStatus = "approved"
	AdminApplyRejected AdminApplyStatus = "rejected"
)

// AdminApply is one administrator-role application.
type AdminApply struct {
	ID         string           `json:"id"`
	UserID     string           `json:"userId"`
	Scope      string           `json:"scope"`
	Reason     string           `json:"reason"`
	Contact    string           `json:"contact"`
	Status     AdminApplyStatus `json:"status"`
	CreatedAt  time.Time        `json:"createdAt"`
	DecidedAt  *time.Time       `json:"decidedAt,omitempty"`
	DecidedBy  string           `json:"decidedBy,omitempty"`
}

// AdminApplyLatest returns the user's most recent application, if any.
func (s *Store) AdminApplyLatest(uid string) (AdminApply, bool) {
	const q = `SELECT id, user_id, scope, reason, contact, status, created_at, decided_at, COALESCE(decided_by, '')
	             FROM admin_applications
	            WHERE user_id = $1
	            ORDER BY created_at DESC
	            LIMIT 1`
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var a AdminApply
	var decidedAt *time.Time
	err := s.pool.QueryRow(ctx, q, uid).
		Scan(&a.ID, &a.UserID, &a.Scope, &a.Reason, &a.Contact, &a.Status, &a.CreatedAt, &decidedAt, &a.DecidedBy)
	if err != nil {
		return AdminApply{}, false
	}
	a.DecidedAt = decidedAt
	return a, true
}

// AdminApplyCreate inserts a new pending application; conflicts on existing pending row.
func (s *Store) AdminApplyCreate(uid, scope, reason, contact string) (AdminApply, error) {
	scope = strings.TrimSpace(scope)
	reason = strings.TrimSpace(reason)
	contact = strings.TrimSpace(contact)

	a := AdminApply{
		ID:      "aa_" + randomID(),
		UserID:  uid,
		Scope:   scope,
		Reason:  reason,
		Contact: contact,
		Status:  AdminApplyPending,
	}
	const q = `INSERT INTO admin_applications (id, user_id, scope, reason, contact, status)
	           VALUES ($1, $2, $3, $4, $5, 'pending')
	           RETURNING created_at`
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := s.pool.QueryRow(ctx, q, a.ID, a.UserID, a.Scope, a.Reason, a.Contact).Scan(&a.CreatedAt); err != nil {
		if isUniqueViolation(err) {
			return AdminApply{}, ErrAdminApplyPendingExists
		}
		return AdminApply{}, err
	}
	return a, nil
}

// AdminApplyWithdrawPending deletes the user's pending application, if any.
func (s *Store) AdminApplyWithdrawPending(uid string) error {
	const q = `DELETE FROM admin_applications WHERE user_id = $1 AND status = 'pending'`
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	tag, err := s.pool.Exec(ctx, q, uid)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrAdminApplyNotFound
	}
	return nil
}
