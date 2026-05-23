// Whitelist store — backed by PostgreSQL.
//
// Phone uniqueness is enforced per user by a unique index on
// (user_id, phone) declared in internal/db/db.go.
package store

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

// ErrWhitelistDuplicate signals the same phone is already on file for this user.
var ErrWhitelistDuplicate = errors.New("whitelist phone duplicate")

// ErrWhitelistNotFound signals the entry id was not found for this user.
var ErrWhitelistNotFound = errors.New("whitelist entry not found")

// WhitelistEntry is one entry in a user's whitelist.
type WhitelistEntry struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Phone     string    `json:"phone"`
	Name      string    `json:"name"`
	Relation  string    `json:"relation"`
	CreatedAt time.Time `json:"createdAt"`
}

// WhitelistList returns the user's whitelist ordered by creation time.
func (s *Store) WhitelistList(uid string) []WhitelistEntry {
	const q = `SELECT id, user_id, phone, name, relation, created_at
	             FROM whitelist_entries
	            WHERE user_id = $1
	            ORDER BY created_at ASC`
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	rows, err := s.pool.Query(ctx, q, uid)
	if err != nil {
		return []WhitelistEntry{}
	}
	defer rows.Close()
	out := []WhitelistEntry{}
	for rows.Next() {
		var e WhitelistEntry
		if err := rows.Scan(&e.ID, &e.UserID, &e.Phone, &e.Name, &e.Relation, &e.CreatedAt); err != nil {
			return out
		}
		out = append(out, e)
	}
	return out
}

// WhitelistCreate inserts a new whitelist entry.
func (s *Store) WhitelistCreate(uid, phone, name, relation string) (WhitelistEntry, error) {
	phone = strings.TrimSpace(phone)
	name = strings.TrimSpace(name)
	relation = strings.TrimSpace(relation)

	e := WhitelistEntry{
		ID:       "wl_" + randomID(),
		UserID:   uid,
		Phone:    phone,
		Name:     name,
		Relation: relation,
	}
	const q = `INSERT INTO whitelist_entries (id, user_id, phone, name, relation)
	           VALUES ($1, $2, $3, $4, $5)
	           RETURNING created_at`
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := s.pool.QueryRow(ctx, q, e.ID, e.UserID, e.Phone, e.Name, e.Relation).Scan(&e.CreatedAt); err != nil {
		if isUniqueViolation(err) {
			return WhitelistEntry{}, ErrWhitelistDuplicate
		}
		return WhitelistEntry{}, err
	}
	return e, nil
}

// WhitelistUpdate overwrites phone/name/relation on the user's entry identified by id.
func (s *Store) WhitelistUpdate(uid, id, phone, name, relation string) (WhitelistEntry, error) {
	phone = strings.TrimSpace(phone)
	name = strings.TrimSpace(name)
	relation = strings.TrimSpace(relation)

	const q = `UPDATE whitelist_entries
	              SET phone = $3, name = $4, relation = $5
	            WHERE user_id = $1 AND id = $2
	        RETURNING id, user_id, phone, name, relation, created_at`
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var e WhitelistEntry
	err := s.pool.QueryRow(ctx, q, uid, id, phone, name, relation).
		Scan(&e.ID, &e.UserID, &e.Phone, &e.Name, &e.Relation, &e.CreatedAt)
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

// WhitelistDelete removes the user's entry by id.
func (s *Store) WhitelistDelete(uid, id string) error {
	const q = `DELETE FROM whitelist_entries WHERE user_id = $1 AND id = $2`
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	tag, err := s.pool.Exec(ctx, q, uid, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrWhitelistNotFound
	}
	return nil
}
