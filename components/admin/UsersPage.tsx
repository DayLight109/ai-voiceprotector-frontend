"use client";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import Modal from "@/components/shared/Modal";
import { useToast } from "@/components/shared/Toast";
import { useConfirm } from "@/components/shared/Confirm";
import { FAMILY_ADMIN_NAV, ADMIN_NAV } from "@/lib/nav";
import { type ManagedUser } from "@/lib/domain-types";
import { APIError } from "@/lib/api";
import { useHybridUsers } from "@/lib/users-store";
import { Plus, Trash2, Edit3, UserPlus, User, Users, Briefcase, ShieldCheck, Shield } from "lucide-react";

// 角色 → 标签文案、色调与头像图标；头像按角色显示对应图标与色调，保证视觉上与角色对应。
const ROLE_META: Record<string, { tone: string; label: string; Icon: any }> = {
  family: { tone: "amber", label: "家庭成员", Icon: User },
  biz: { tone: "mint", label: "员工", Icon: Briefcase },
  family_admin: { tone: "indigo", label: "家庭管理员", Icon: Users },
  admin: { tone: "indigo", label: "企业管理员", Icon: ShieldCheck },
  sysadmin: { tone: "coral", label: "系统管理员", Icon: Shield },
};
function roleMeta(role: string) {
  return ROLE_META[role] ?? { tone: "amber", label: role, Icon: User };
}

export default function UsersPage({ role }: { role: "family-admin" | "admin" }) {
  const toast = useToast();
  const confirm = useConfirm();
  const isFam = role === "family-admin";
  const list = useHybridUsers();
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [open, setOpen] = useState(false);

  const onSubmit = async (form: any) => {
    try {
      if (editing) {
        await list.update(editing.id, {
          name: form.name, role: form.role, dept: form.dept,
          email: form.email, status: editing.status,
        });
        toast("success", "已更新", form.name);
      } else {
        // 角色由控制台类型决定：家庭管理员建 family、企业管理员建 biz
        // （后端 manageableRoles 只允许这两种，旧 viewer/operator 会被 403）
        await list.create({
          name: form.name, role: isFam ? "family" : "biz", dept: form.dept,
          email: form.email, status: "active", password: form.password,
        });
        toast("success", "已新增成员", form.name);
      }
      setOpen(false);
      setEditing(null);
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "保存失败");
    }
  };

  const onDelete = async (r: ManagedUser) => {
    const ok = await confirm({
      title: isFam ? "移除成员？" : "删除用户？",
      desc: `将${isFam ? "移除家庭成员" : "删除用户"}「${r.name}」，其账号与权限将被一并清除。`,
      tone: "danger",
      confirmText: isFam ? "移除" : "删除",
    });
    if (!ok) return;
    try {
      await list.remove(r.id);
      toast("success", "已删除", r.name);
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "删除失败");
    }
  };

  return (
    <AppShell
      role={role}
      nav={isFam ? FAMILY_ADMIN_NAV : ADMIN_NAV}
      breadcrumb={["SENTINEL", isFam ? "家庭管理员" : "企业管理员", "多用户管理"]}
    >
      <PageHeader
        eyebrow={isFam ? "FAMILY USERS" : "ENTERPRISE USERS"}
        title={isFam ? "家庭成员管理" : "员工管理"}
        desc={isFam ? "管理家庭成员账号、角色与状态。" : "管理员工账号、部门归属与状态。"}
        actions={
          <button onClick={() => { setEditing(null); setOpen(true); }} className="btn-indigo py-2.5 px-4 text-[calc(13px*var(--fz))]">
            <UserPlus size={14} /> 新增成员
          </button>
        }
      />

      <div className="panel p-6">
        {list.error && (
          <div className="mb-4 px-4 py-3 rounded-2xl text-[calc(13px*var(--fz))] font-medium"
               style={{ background: "var(--coral-soft)", color: "var(--coral-deep)", border: "1px solid var(--coral)" }}>
            {list.error}
          </div>
        )}
        <DataTable<ManagedUser>
          rows={list.items}
          searchKeys={["name", "email", "dept", "id"]}
          columns={[
            { key: "id", label: "工号", render: (r) => <span className="font-mono text-[calc(12px*var(--fz))] font-bold text-ink-soft">{r.id}</span> },
            {
              key: "name", label: "姓名", render: (r) => {
                const v = roleMeta(r.role);
                return (
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: `var(--${v.tone}-soft)`, color: `var(--${v.tone}-deep)` }} title={v.label}>
                      <v.Icon size={14} />
                    </div>
                    <span className="font-display font-extrabold">{r.name}</span>
                  </div>
                );
              }
            },
            { key: "role", label: "角色", render: (r) => {
              const v = roleMeta(r.role);
              return <span className="tag-chip" data-tone={v.tone}>{v.label}</span>;
            } },
            { key: "dept", label: isFam ? "关系" : "部门" },
            {
              key: "status", label: "状态", render: (r) => {
                const m = { active: { bg: "var(--mint-soft)", fg: "var(--mint-deep)", l: "正常" }, review: { bg: "var(--amber-soft)", fg: "var(--amber-deep)", l: "审核中" }, suspended: { bg: "var(--coral-soft)", fg: "var(--coral-deep)", l: "已停用" } }[r.status];
                return <span className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] px-2 py-1 rounded-full font-bold" style={{ background: m.bg, color: m.fg }}>{m.l}</span>;
              }
            },
            { key: "lastLoginAt", label: "最近登录", render: (r) => <span className="font-mono text-[calc(11px*var(--fz))] text-ink-soft font-bold">{r.lastLoginAt ? r.lastLoginAt.replace("T", " ").slice(0, 16) : "—"}</span> },
          ]}
          actions={(r) => (
            <div className="flex items-center gap-1 justify-end">
              <button onClick={() => { setEditing(r); setOpen(true); }} className="w-8 h-8 rounded-lg hover:bg-canvas-2 flex items-center justify-center"><Edit3 size={13} /></button>
              <button onClick={() => onDelete(r)} className="w-8 h-8 rounded-lg hover:bg-coral-soft text-coral-deep flex items-center justify-center"><Trash2 size={13} /></button>
            </div>
          )}
        />
      </div>

      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        title={editing ? "编辑成员" : "新增成员"}
        footer={
          <>
            <button onClick={() => { setOpen(false); setEditing(null); }} className="btn-ghost py-2 px-4 text-[calc(13px*var(--fz))]">取消</button>
            <button onClick={() => (document.getElementById("user-form") as HTMLFormElement)?.requestSubmit()} className="btn-indigo py-2 px-4 text-[calc(13px*var(--fz))]">保存</button>
          </>
        }
      >
        <UserForm editing={editing} onSubmit={onSubmit} isFam={isFam} />
      </Modal>
    </AppShell>
  );
}

function UserForm({ editing, onSubmit, isFam }: { editing: ManagedUser | null; onSubmit: (f: any) => void; isFam: boolean }) {
  const [form, setForm] = useState<any>(
    editing
      ? { ...editing, dept: editing.dept ?? "", email: editing.email ?? "" }
      : { name: "", role: isFam ? "family" : "biz", dept: "", email: "", password: "" }
  );
  return (
    <form id="user-form" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <Field label="姓名"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="ipt" /></Field>
      <Field label={isFam ? "亲属关系" : "部门"}><input value={form.dept} onChange={(e) => setForm({ ...form, dept: e.target.value })} className="ipt" placeholder={isFam ? "父亲 / 母亲 / 兄弟…" : "客服 / 风控 / 审计…"} /></Field>
      <Field label="联系方式"><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="ipt" placeholder="手机号 / 邮箱" /></Field>
      {!editing && (
        <Field label="初始登录密码">
          <input
            required
            type="password"
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="ipt"
            placeholder="至少 8 位，成员登录后可自行修改"
            autoComplete="new-password"
          />
        </Field>
      )}
      <style>{`.ipt{width:100%;padding:12px 14px;border-radius:14px;border:1px solid var(--border);background:var(--surface);font-size:13px;font-weight:500}.ipt:focus{outline:none;border-color:var(--indigo);box-shadow:0 0 0 3px color-mix(in srgb, var(--indigo) 18%, transparent)}`}</style>
    </form>
  );
}

function Field({ label, children }: any) {
  return (
    <div>
      <label className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold block mb-1.5">{label}</label>
      {children}
    </div>
  );
}


