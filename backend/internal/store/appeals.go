// Appeals store — backed by PostgreSQL.
//
// An appeal is a user-submitted request of type "误判申诉" (a number was
// wrongly flagged) or "号码举报" (a suspicious number deserves blacklisting).
// Status flows from "处理中" → "已通过" / "已驳回".
package store

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

var ErrAppealNotFound = errors.New("appeal not found")

type Appeal struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Type      string    `json:"type"`
	Number    string    `json:"number"`
	Reason    string    `json:"reason"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
}

func (s *Store) AppealsList(uid string) []Appeal {
	const q = `SELECT id, user_id, type, number, reason, status, created_at
	             FROM appeals
	            WHERE user_id = $1
	            ORDER BY created_at DESC`
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	rows, err := s.pool.Query(ctx, q, uid)
	if err != nil {
		return []Appeal{}
	}
	defer rows.Close()
	out := []Appeal{}
	for rows.Next() {
		var a Appeal
		if err := rows.Scan(&a.ID, &a.UserID, &a.Type, &a.Number, &a.Reason, &a.Status, &a.CreatedAt); err != nil {
			return out
		}
		out = append(out, a)
	}
	return out
}

func (s *Store) AppealsCreate(uid, typ, number, reason string) (Appeal, error) {
	a := Appeal{
		ID:     "ap_" + randomID(),
		UserID: uid,
		Type:   strings.TrimSpace(typ),
		Number: strings.TrimSpace(number),
		Reason: strings.TrimSpace(reason),
		Status: "处理中",
	}
	const q = `INSERT INTO appeals (id, user_id, type, number, reason, status)
	           VALUES ($1, $2, $3, $4, $5, $6)
	           RETURNING created_at`
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := s.pool.QueryRow(ctx, q, a.ID, a.UserID, a.Type, a.Number, a.Reason, a.Status).Scan(&a.CreatedAt); err != nil {
		return Appeal{}, err
	}
	return a, nil
}

func (s *Store) AppealsSetStatus(uid, id, status string) (Appeal, error) {
	const q = `UPDATE appeals
	              SET status = $3
	            WHERE user_id = $1 AND id = $2
	        RETURNING id, user_id, type, number, reason, status, created_at`
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var a Appeal
	err := s.pool.QueryRow(ctx, q, uid, id, status).
		Scan(&a.ID, &a.UserID, &a.Type, &a.Number, &a.Reason, &a.Status, &a.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Appeal{}, ErrAppealNotFound
		}
		return Appeal{}, err
	}
	return a, nil
}
