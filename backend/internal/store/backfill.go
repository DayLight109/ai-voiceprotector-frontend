// One-shot backfill: collapse the legacy `tenant-demo` namespace into the
// per-role tenants returned by TenantForRole. Idempotent — only touches
// rows whose tenant_id is still the schema-default 'tenant-demo'. Safe to
// run on every server start; once the table is clean the UPDATE/DELETE
// statements simply match zero rows.
package store

import (
	"context"
	"time"
)

// MigrateLegacyDemoTenant rewrites historical rows created before per-role
// tenants existed. It runs in a single transaction so partial state can't be
// observed by request handlers.
func (s *Store) MigrateLegacyDemoTenant(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// auth_users: drive purely by role.
	if _, err := tx.Exec(ctx, `
		UPDATE auth_users SET tenant_id = 'tenant-family'
		 WHERE tenant_id = 'tenant-demo' AND role IN ('family','family_admin')`); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		UPDATE auth_users SET tenant_id = 'tenant-biz'
		 WHERE tenant_id = 'tenant-demo' AND role IN ('biz','admin')`); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		UPDATE auth_users SET tenant_id = ''
		 WHERE tenant_id = 'tenant-demo' AND role = 'sysadmin'`); err != nil {
		return err
	}

	// blacklist_entries: a sysadmin should never have inserted a private
	// (non-global) row, but if any leaked into 'tenant-demo' we drop them
	// rather than guess a side.
	if _, err := tx.Exec(ctx, `
		DELETE FROM blacklist_entries
		 WHERE tenant_id = 'tenant-demo' AND is_global = false
		   AND created_by IN (SELECT id FROM auth_users WHERE role = 'sysadmin')`); err != nil {
		return err
	}

	// blacklist_entries: drop legacy rows that would collide with an
	// already-present row in the target tenant. Keeps the unique index
	// (tenant_id, number) happy; the surviving row is the newer one.
	if _, err := tx.Exec(ctx, `
		DELETE FROM blacklist_entries old
		 WHERE old.tenant_id = 'tenant-demo' AND old.is_global = false
		   AND EXISTS (
		       SELECT 1 FROM blacklist_entries n
		        WHERE n.is_global = false
		          AND n.number = old.number
		          AND n.tenant_id = CASE
		              WHEN (SELECT role FROM auth_users WHERE id = old.created_by)
		                   IN ('family','family_admin') THEN 'tenant-family'
		              WHEN (SELECT role FROM auth_users WHERE id = old.created_by)
		                   IN ('biz','admin') THEN 'tenant-biz'
		              ELSE 'tenant-family'
		          END
		   )`); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, `
		UPDATE blacklist_entries SET tenant_id = 'tenant-family'
		 WHERE tenant_id = 'tenant-demo' AND is_global = false
		   AND created_by IN (SELECT id FROM auth_users WHERE role IN ('family','family_admin'))`); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		UPDATE blacklist_entries SET tenant_id = 'tenant-biz'
		 WHERE tenant_id = 'tenant-demo' AND is_global = false
		   AND created_by IN (SELECT id FROM auth_users WHERE role IN ('biz','admin'))`); err != nil {
		return err
	}
	// Orphan rows (created_by no longer in auth_users): default to family.
	if _, err := tx.Exec(ctx, `
		UPDATE blacklist_entries SET tenant_id = 'tenant-family'
		 WHERE tenant_id = 'tenant-demo' AND is_global = false`); err != nil {
		return err
	}

	// managed_users: same rule, no unique constraint to worry about.
	if _, err := tx.Exec(ctx, `
		UPDATE managed_users SET tenant_id = 'tenant-family'
		 WHERE tenant_id = 'tenant-demo'
		   AND created_by IN (SELECT id FROM auth_users WHERE role IN ('family','family_admin'))`); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		UPDATE managed_users SET tenant_id = 'tenant-biz'
		 WHERE tenant_id = 'tenant-demo'
		   AND created_by IN (SELECT id FROM auth_users WHERE role IN ('biz','admin'))`); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		UPDATE managed_users SET tenant_id = 'tenant-family'
		 WHERE tenant_id = 'tenant-demo'`); err != nil {
		return err
	}

	// whitelist_entries: legacy rows have tenant_id='' (schema default before
	// the per-tenant migration). Drop sysadmin-owned rows; tenant-namespace
	// the rest by the creator's role; same dedup-then-update pattern as
	// blacklist to avoid violating the (tenant_id, phone) unique index.
	if _, err := tx.Exec(ctx, `
		DELETE FROM whitelist_entries
		 WHERE tenant_id = ''
		   AND user_id IN (SELECT id FROM auth_users WHERE role = 'sysadmin')`); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		DELETE FROM whitelist_entries old
		 WHERE old.tenant_id = ''
		   AND EXISTS (
		       SELECT 1 FROM whitelist_entries n
		        WHERE n.phone = old.phone
		          AND n.tenant_id = CASE
		              WHEN (SELECT role FROM auth_users WHERE id = old.user_id)
		                   IN ('family','family_admin') THEN 'tenant-family'
		              WHEN (SELECT role FROM auth_users WHERE id = old.user_id)
		                   IN ('biz','admin') THEN 'tenant-biz'
		              ELSE 'tenant-family'
		          END
		   )`); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		UPDATE whitelist_entries
		   SET tenant_id = 'tenant-family',
		       created_by = CASE WHEN created_by = '' THEN user_id ELSE created_by END
		 WHERE tenant_id = ''
		   AND user_id IN (SELECT id FROM auth_users WHERE role IN ('family','family_admin'))`); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		UPDATE whitelist_entries
		   SET tenant_id = 'tenant-biz',
		       created_by = CASE WHEN created_by = '' THEN user_id ELSE created_by END
		 WHERE tenant_id = ''
		   AND user_id IN (SELECT id FROM auth_users WHERE role IN ('biz','admin'))`); err != nil {
		return err
	}
	// Orphan rows (creator gone): default to family.
	if _, err := tx.Exec(ctx, `
		UPDATE whitelist_entries
		   SET tenant_id = 'tenant-family',
		       created_by = CASE WHEN created_by = '' THEN user_id ELSE created_by END
		 WHERE tenant_id = ''`); err != nil {
		return err
	}

	return tx.Commit(ctx)
}
