// Emergency contacts store — backed by PostgreSQL.
//
// Phone uniqueness is enforced per user by a unique index on
// (user_id, phone) declared in internal/db/db.go. Conflicts surface as
// ErrEmergencyContactDuplicate; missing rows surface as ErrEmergencyContactNotFound.
package store

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// ErrEmergencyContactDuplicate signals the same phone is already on file for this user.
var ErrEmergencyContactDuplicate = errors.New("emergency contact phone duplicate")

// ErrEmergencyContactNotFound signals the contact id was not found for this user.
var ErrEmergencyContactNotFound = errors.New("emergency contact not found")

// EmergencyContact is one entry in a user's emergency contact list.
type EmergencyContact struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Name      string    `json:"name"`
	Phone     string    `json:"phone"`
	Relation  string    `json:"relation"`
	CreatedAt time.Time `json:"createdAt"`
}

// EmergencyList returns the user's contacts ordered by creation time.
func (s *Store) EmergencyList(uid string) []EmergencyContact {
	const q = `SELECT id, user_id, name, phone, relation, created_at
	             FROM emergency_contacts
	            WHERE user_id = $1
	            ORDER BY created_at ASC`
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	rows, err := s.pool.Query(ctx, q, uid)
	if err != nil {
		return []EmergencyContact{}
	}
	defer rows.Close()
	out := []EmergencyContact{}
	for rows.Next() {
		var ec EmergencyContact
		if err := rows.Scan(&ec.ID, &ec.UserID, &ec.Name, &ec.Phone, &ec.Relation, &ec.CreatedAt); err != nil {
			return out
		}
		out = append(out, ec)
	}
	return out
}

// EmergencyCreate inserts a new contact for the user. Returns
// ErrEmergencyContactDuplicate when (user_id, phone) collides.
func (s *Store) EmergencyCreate(uid, name, phone, relation string) (EmergencyContact, error) {
	name = strings.TrimSpace(name)
	phone = strings.TrimSpace(phone)
	relation = strings.TrimSpace(relation)

	ec := EmergencyContact{
		ID:       "ec_" + randomID(),
		UserID:   uid,
		Name:     name,
		Phone:    phone,
		Relation: relation,
	}
	const q = `INSERT INTO emergency_contacts (id, user_id, name, phone, relation)
	           VALUES ($1, $2, $3, $4, $5)
	           RETURNING created_at`
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := s.pool.QueryRow(ctx, q, ec.ID, ec.UserID, ec.Name, ec.Phone, ec.Relation).Scan(&ec.CreatedAt); err != nil {
		if isUniqueViolation(err) {
			return EmergencyContact{}, ErrEmergencyContactDuplicate
		}
		return EmergencyContact{}, err
	}
	return ec, nil
}

// EmergencyUpdate overwrites name/phone/relation on the user's contact identified by id.
func (s *Store) EmergencyUpdate(uid, id, name, phone, relation string) (EmergencyContact, error) {
	name = strings.TrimSpace(name)
	phone = strings.TrimSpace(phone)
	relation = strings.TrimSpace(relation)

	const q = `UPDATE emergency_contacts
	              SET name = $3, phone = $4, relation = $5
	            WHERE user_id = $1 AND id = $2
	        RETURNING id, user_id, name, phone, relation, created_at`
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var ec EmergencyContact
	err := s.pool.QueryRow(ctx, q, uid, id, name, phone, relation).
		Scan(&ec.ID, &ec.UserID, &ec.Name, &ec.Phone, &ec.Relation, &ec.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return EmergencyContact{}, ErrEmergencyContactNotFound
		}
		if isUniqueViolation(err) {
			return EmergencyContact{}, ErrEmergencyContactDuplicate
		}
		return EmergencyContact{}, err
	}
	return ec, nil
}

// EmergencyDelete removes the user's contact by id.
func (s *Store) EmergencyDelete(uid, id string) error {
	const q = `DELETE FROM emergency_contacts WHERE user_id = $1 AND id = $2`
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	tag, err := s.pool.Exec(ctx, q, uid, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrEmergencyContactNotFound
	}
	return nil
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

func randomID() string {
	var b [8]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}
