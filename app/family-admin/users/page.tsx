"use client";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import Modal from "@/components/shared/Modal";
import { useToast } from "@/components/shared/Toast";
import { FAMILY_ADMIN_NAV, ADMIN_NAV } from "@/lib/nav";
import { SEED, type ManagedUser } from "@/lib/mock";
import { useLocalStorage, uid } from "@/lib/storage";
import { Plus, Trash2, Edit3, UserPlus } from "lucide-react";

export default function FamilyUsersPage() {
  return <UsersPage role="family-admin" />;
}

export function UsersPage({ role }: { role: "family-admin" | "admin" }) {
  const toast = useToast();
  const isFam = role === "family-admin";
  const [users, setUsers] = useLocalStorage<ManagedUser[]>(isFam ? "family.users" : "admin.users", SEED.managedUsers);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [open, setOpen] = useState(false);

  const onSubmit = (form: any) => {
    if (editing) {
      setUsers((p) => p.map((u) => (u.id === editing.id ? { ...editing, ...form } : u)));
      toast("success", "已更新", form.name);
    } else {
      const entry: ManagedUser = { id: uid("u"), name: form.name, role: form.role, dept: form.dept, status: "active", email: form.email, last: "刚刚" };
      setUsers((p) => [entry, ...p]);
      toast("success", "已新增成员", form.name);
    }
    setOpen(false);
    setEditing(null);
  };

  return (
    <AppShell
      role={role}
      userName={isFam ? "李梦楠" : "李梦楠"}
      nav={isFam ? FAMILY_ADMIN_NAV : ADMIN_NAV}
      breadcrumb={["SENTINEL", isFam ? "家庭管理员" : "企业管理员", "多用户管理"]}
    >
      <PageHeader
        eyebrow={isFam ? "FAMILY USERS" : "ENTERPRISE USERS"}
        title={isFam ? "家庭成员管理" : "员工管理"}
        desc={isFam ? "管理家庭成员账号、角色与状态。" : "管理员工账号、部门归属与状态。"}
        actions={
          <button onClick={() => { setEditing(null); setOpen(true); }} className="btn-indigo py-2.5 px-4 text-[13px]">
            <UserPlus size={14} /> 新增成员
          </button>
        }
      />

      <div className="panel p-6">
        <DataTable<ManagedUser>
          rows={users}
          searchKeys={["name", "email", "dept", "id"]}
          columns={[
            { key: "id", label: "工号", render: (r) => <span className="font-mono text-[12px] font-bold text-ink-soft">{r.id}</span> },
            {
              key: "name", label: "姓名", render: (r) => (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center font-display text-white text-[11px] font-extrabold" style={{ background: "linear-gradient(135deg, var(--indigo), var(--coral))" }}>
                    {r.name.slice(0, 1)}
                  </div>
                  <span className="font-display font-extrabold">{r.name}</span>
                </div>
              )
            },
            { key: "role", label: "角色", render: (r) => <span className="tag-chip" data-tone={r.role === "admin" ? "indigo" : r.role === "operator" ? "mint" : "amber"}>{r.role === "admin" ? "管理员" : r.role === "operator" ? "操作员" : "查看者"}</span> },
            { key: "dept", label: isFam ? "关系" : "部门" },
            {
              key: "status", label: "状态", render: (r) => {
                const m = { active: { bg: "var(--mint-soft)", fg: "var(--mint-deep)", l: "正常" }, review: { bg: "var(--amber-soft)", fg: "var(--amber-deep)", l: "审核中" }, suspended: { bg: "var(--coral-soft)", fg: "var(--coral-deep)", l: "已停用" } }[r.status];
                return <span className="font-mono text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded-full font-bold" style={{ background: m.bg, color: m.fg }}>{m.l}</span>;
              }
            },
            { key: "last", label: "活动", render: (r) => <span className="font-mono text-[11px] text-ink-soft font-bold">{r.last}</span> },
          ]}
          actions={(r) => (
            <div className="flex items-center gap-1 justify-end">
              <button onClick={() => { setEditing(r); setOpen(true); }} className="w-8 h-8 rounded-lg hover:bg-canvas-2 flex items-center justify-center"><Edit3 size={13} /></button>
              <button onClick={() => { setUsers((p) => p.filter((x) => x.id !== r.id)); toast("success", "已删除", r.name); }} className="w-8 h-8 rounded-lg hover:bg-coral-soft text-coral-deep flex items-center justify-center"><Trash2 size={13} /></button>
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
            <button onClick={() => { setOpen(false); setEditing(null); }} className="btn-ghost py-2 px-4 text-[13px]">取消</button>
            <button onClick={() => (document.getElementById("user-form") as HTMLFormElement)?.requestSubmit()} className="btn-indigo py-2 px-4 text-[13px]">保存</button>
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
    editing ?? { name: "", role: "viewer", dept: "", email: "" }
  );
  return (
    <form id="user-form" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <Field label="姓名"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="ipt" /></Field>
      <Field label="角色">
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="ipt">
          <option value="admin">管理员</option>
          <option value="operator">操作员</option>
          <option value="viewer">查看者</option>
        </select>
      </Field>
      <Field label={isFam ? "亲属关系" : "部门"}><input value={form.dept} onChange={(e) => setForm({ ...form, dept: e.target.value })} className="ipt" placeholder={isFam ? "父亲 / 母亲 / 兄弟…" : "客服 / 风控 / 审计…"} /></Field>
      <Field label="联系方式"><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="ipt" placeholder="手机号 / 邮箱" /></Field>
      <style>{`.ipt{width:100%;padding:12px 14px;border-radius:14px;border:1px solid var(--border);background:var(--surface);font-size:13px;font-weight:500}.ipt:focus{outline:none;border-color:var(--indigo);box-shadow:0 0 0 3px color-mix(in srgb, var(--indigo) 18%, transparent)}`}</style>
    </form>
  );
}

function Field({ label, children }: any) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold block mb-1.5">{label}</label>
      {children}
    </div>
  );
}
