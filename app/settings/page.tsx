"use client";
import { useEffect, useRef, useState } from "react";
import { User, Shield, Bell, Palette, Key, Smartphone, LogOut, Home, Users, Settings as SettingsIcon, ChevronRight, CheckCircle2, Fingerprint, ScanFace, Phone, Trash2, Pencil } from "lucide-react";
import AppShell from "@/components/AppShell";
import { useToast } from "@/components/shared/Toast";
import { api, APIError, getAccessToken, type EmergencyContact, type SessionView } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import { useFontSize } from "@/lib/font-size";
import { useAppearance, type Density } from "@/lib/appearance";
import { useLang, type Lang } from "@/lib/i18n";
import { useLocalStorage } from "@/lib/storage";

type TabKey = "profile" | "security" | "notify" | "appearance";

export default function SettingsPage() {
  const [tab, setTab] = useState<TabKey>("profile");
  const { t } = useLang();

  const NAV = [
    { href: "/app", label: t("首页"), icon: Home },
    { href: "/family-admin/users", label: t("家属同步"), icon: Users },
    { href: "/settings", label: t("系统设置"), icon: SettingsIcon },
  ];

  const TABS: { k: TabKey; label: string; icon: any; desc: string }[] = [
    { k: "profile", label: t("个人信息"), icon: User, desc: t("头像、昵称、联系方式") },
    { k: "security", label: t("账户安全"), icon: Shield, desc: t("密码、生物认证、设备") },
    { k: "notify", label: t("告警与通知"), icon: Bell, desc: t("推送渠道、静音时段") },
    { k: "appearance", label: t("外观偏好"), icon: Palette, desc: t("主题、密度、字号") },
  ];

  return (
    <AppShell
      role="family"
      userName="王磊"
      nav={NAV}
      breadcrumb={["SENTINEL", t("设置"), TABS.find((x) => x.k === tab)!.label]}
    >
      <div className="mb-8">
        <h1 className="font-display text-[calc(32px*var(--fz))] md:text-[calc(40px*var(--fz))] font-extrabold tracking-tight">{t("系统设置")}</h1>
        <p className="mt-2 text-[calc(14px*var(--fz))] text-ink-soft font-medium">{t("管理账户、安全、通知与外观偏好。")}</p>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <aside className="col-span-12 md:col-span-4 lg:col-span-3 space-y-1.5">
          {TABS.map((t) => {
            const active = t.k === tab;
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-colors"
                style={{
                  background: active ? "var(--surface)" : "transparent",
                  boxShadow: active ? "var(--shadow-sm)" : "none",
                  border: active ? "1px solid var(--border)" : "1px solid transparent",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: active ? "var(--indigo-soft)" : "var(--canvas-2)",
                    color: active ? "var(--indigo-deep)" : "var(--ink-soft)",
                  }}
                >
                  <t.icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-[calc(14px*var(--fz))] font-extrabold" style={{ color: active ? "var(--ink)" : "var(--ink-2)" }}>{t.label}</div>
                  <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.12em] text-ink-soft font-bold truncate">{t.desc}</div>
                </div>
                {active && <ChevronRight size={14} className="text-ink-soft" />}
              </button>
            );
          })}
        </aside>

        <section className="col-span-12 md:col-span-8 lg:col-span-9 panel p-6 md:p-8">
          {tab === "profile" && <Profile />}
          {tab === "security" && <Security />}
          {tab === "notify" && <Notify />}
          {tab === "appearance" && <Appearance />}
        </section>
      </div>
    </AppShell>
  );
}

function Row({ label, desc, children }: any) {
  return (
    <div className="flex items-start justify-between gap-6 py-5 border-b border-border last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="font-display text-[calc(14px*var(--fz))] font-extrabold">{label}</div>
        {desc && <div className="mt-1 text-[calc(12px*var(--fz))] text-ink-soft font-medium">{desc}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ storageKey, defaultChecked = false, onToggle }: { storageKey: string; defaultChecked?: boolean; onToggle?: (v: boolean) => void }) {
  const [on, setOn] = useLocalStorage<boolean>(`settings.toggle.${storageKey}`, defaultChecked);
  return (
    <button
      onClick={() => { const next = !on; setOn(next); onToggle?.(next); }}
      role="switch"
      aria-checked={on}
      className="relative w-11 h-6 rounded-full transition-colors"
      style={{ background: on ? "var(--indigo)" : "var(--canvas-3)" }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all"
        style={{ left: on ? "22px" : "2px" }}
      />
    </button>
  );
}

function Profile() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [me, setMe] = useState<{ id: string; name: string; role: string; phone?: string; hasAvatar?: boolean } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [viewing, setViewing] = useState(false);
  const [cropping, setCropping] = useState<{ src: string; w: number; h: number } | null>(null);
  // 编辑弹窗（草稿；null = 关闭）
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editingPhone, setEditingPhone] = useState<string | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [contactsOpen, setContactsOpen] = useState(false);

  // 把后端 /me/avatar 拉成 blob URL，避免 <img src> 缺少 Authorization 头
  const refreshAvatar = async (hasAvatar: boolean | undefined) => {
    if (!hasAvatar) {
      setAvatarUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
      return;
    }
    try {
      const token = getAccessToken();
      const apiBase = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) || "http://localhost:8080";
      const resp = await fetch(`${apiBase}/api/v1/me/avatar`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });
      if (!resp.ok) return;
      const blob = await resp.blob();
      setAvatarUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } catch {}
  };

  useEffect(() => {
    let cancelled = false;
    api.me().then((u) => {
      if (cancelled) return;
      setMe({ id: u.id, name: u.name, role: u.role, phone: u.phone, hasAvatar: u.hasAvatar });
      void refreshAvatar(u.hasAvatar);
    }).catch(() => {});
    api.emergencyContacts.list().then((rows) => {
      if (cancelled) return;
      setContacts(rows ?? []);
    }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => { if (avatarUrl) URL.revokeObjectURL(avatarUrl); };
  }, [avatarUrl]);

  useEffect(() => {
    if (!viewing && !cropping) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (cropping) setCropping(null);
      else if (viewing) setViewing(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewing, cropping]);

  const onPick = (file: File | null | undefined) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      toast("error", "仅支持 JPG / PNG / WebP");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast("error", "头像需 ≤ 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const img = new window.Image();
      img.onload = () => setCropping({ src, w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => toast("error", "图片解码失败");
      img.src = src;
    };
    reader.onerror = () => toast("error", "图片读取失败");
    reader.readAsDataURL(file);
  };

  const applyCropped = async (dataUrl: string) => {
    // 把 dataUrl 转 Blob 再传 multipart
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const updated = await api.uploadAvatar(file);
      setMe({ id: updated.id, name: updated.name, role: updated.role, hasAvatar: updated.hasAvatar });
      await refreshAvatar(updated.hasAvatar);
      setCropping(null);
      toast("success", "头像已更新");
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "头像上传失败");
    }
  };

  const userName = me?.name ?? "—";
  const initial = userName.slice(0, 1) || "?";
  const uid = me?.id ?? "—";
  const roleLabel = me?.role ? me.role.toUpperCase().replace("_", "-") : "USER";

  return (
    <div>
      <div className="pb-6 mb-2 border-b border-border">
        <div className="flex items-center gap-5">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="头像"
              className="w-20 h-20 rounded-3xl object-cover shadow-md cursor-zoom-in select-none"
              onDoubleClick={() => setViewing(true)}
              title="双击查看大图"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center font-display text-white font-extrabold text-[calc(28px*var(--fz))] shadow-md select-none"
              style={{ background: "linear-gradient(135deg, var(--indigo), var(--coral))" }}
              onDoubleClick={() => fileRef.current?.click()}
              title="双击上传头像"
            >
              {initial}
            </div>
          )}
          <div className="flex-1">
            <div className="font-display text-[calc(22px*var(--fz))] font-extrabold">{userName}</div>
            <div className="mt-1 font-mono text-[calc(11px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">{roleLabel} · UID {uid}</div>
            <div className="mt-3 flex items-center gap-2">
              <button
                className="btn-ghost py-2 px-3 text-[calc(12px*var(--fz))]"
                onClick={() => fileRef.current?.click()}
              >
                更换头像
              </button>
              <button
                className="btn-ghost py-2 px-3 text-[calc(12px*var(--fz))]"
                style={{ color: "var(--coral-deep)", borderColor: "var(--coral-soft)" }}
                onClick={async () => {
                  if (!me?.hasAvatar) return;
                  try {
                    const updated = await api.deleteAvatar();
                    setMe({ id: updated.id, name: updated.name, role: updated.role, hasAvatar: updated.hasAvatar });
                    await refreshAvatar(updated.hasAvatar);
                    toast("info", "已删除头像");
                  } catch (e) {
                    toast("error", e instanceof APIError ? e.message : "删除失败");
                  }
                }}
              >
                删除头像
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  onPick(e.target.files?.[0]);
                  if (fileRef.current) fileRef.current.value = "";
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <Row label="昵称" desc="家属同步告警中显示的名称">
        <button
          type="button"
          className="px-4 py-2.5 rounded-xl bg-canvas-2 border border-border font-medium text-[calc(13px*var(--fz))] hover:bg-surface transition-colors w-56 text-left flex items-center justify-between gap-2"
          onClick={() => setEditingName(me?.name ?? "")}
        >
          <span className="truncate">{me?.name ?? "—"}</span>
          <span className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold shrink-0">编辑</span>
        </button>
      </Row>
      <Row label="手机号" desc="用于登录与重要告警短信">
        <button
          type="button"
          className="px-4 py-2.5 rounded-xl bg-canvas-2 border border-border font-medium text-[calc(13px*var(--fz))] hover:bg-surface transition-colors w-56 text-left flex items-center justify-between gap-2"
          onClick={() => setEditingPhone(me?.phone ?? "")}
        >
          <span className="truncate">{me?.phone || "—"}</span>
          <span className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold shrink-0">编辑</span>
        </button>
      </Row>
      <Row label="紧急联系人" desc="发生拦截时一并推送">
        <button
          type="button"
          className="px-4 py-2.5 rounded-xl bg-canvas-2 border border-border font-medium text-[calc(13px*var(--fz))] hover:bg-surface transition-colors w-56 text-left flex items-center justify-between gap-2"
          onClick={() => setContactsOpen(true)}
        >
          <span className="truncate">
            {contacts.length === 0 ? "未添加" : `${contacts.length} 人`}
          </span>
          <span className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold shrink-0">管理</span>
        </button>
      </Row>
      <Row label="常用地址" desc="用于号段归属对比">
        <span className="font-mono text-[calc(12px*var(--fz))] text-ink-soft font-bold">北京 · 海淀区</span>
      </Row>

      {viewing && avatarUrl && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setViewing(false)}
          role="dialog"
          aria-label="头像预览"
        >
          <img
            src={avatarUrl}
            alt="头像大图"
            className="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={() => setViewing(false)}
          />
          <button
            type="button"
            onClick={() => setViewing(false)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur text-white flex items-center justify-center font-mono text-[calc(14px*var(--fz))] font-extrabold"
            aria-label="关闭"
          >
            ×
          </button>
        </div>
      )}

      {editingName !== null && me && (
        <FieldEditor
          field="name"
          label="昵称"
          eyebrow="EDIT DISPLAY NAME"
          initial={editingName}
          currentValue={me.name}
          maxLength={32}
          onChange={(v) => setEditingName(v)}
          onCancel={() => setEditingName(null)}
          onSave={async (v) => {
            const trimmed = v.trim();
            if (trimmed === "" || trimmed === me.name) {
              setEditingName(null);
              return;
            }
            try {
              const updated = await api.updateMe({ name: trimmed });
              setMe({ id: updated.id, name: updated.name, role: updated.role, phone: updated.phone, hasAvatar: updated.hasAvatar });
              setEditingName(null);
              toast("success", "昵称已更新");
            } catch (e) {
              toast("error", e instanceof APIError ? e.message : "保存失败");
            }
          }}
        />
      )}

      {editingPhone !== null && me && (
        <FieldEditor
          field="phone"
          label="手机号"
          eyebrow="EDIT PHONE NUMBER"
          initial={editingPhone}
          currentValue={me.phone ?? ""}
          maxLength={20}
          onChange={(v) => setEditingPhone(v)}
          onCancel={() => setEditingPhone(null)}
          onSave={async (v) => {
            const trimmed = v.trim();
            if (trimmed === (me.phone ?? "")) {
              setEditingPhone(null);
              return;
            }
            try {
              const updated = await api.updateMe({ phone: trimmed });
              setMe({ id: updated.id, name: updated.name, role: updated.role, phone: updated.phone, hasAvatar: updated.hasAvatar });
              setEditingPhone(null);
              toast("success", "手机号已更新");
            } catch (e) {
              toast("error", e instanceof APIError ? e.message : "保存失败");
            }
          }}
        />
      )}

      {cropping && (
        <CropOverlay
          src={cropping.src}
          w={cropping.w}
          h={cropping.h}
          onCancel={() => setCropping(null)}
          onConfirm={applyCropped}
        />
      )}

      {contactsOpen && (
        <EmergencyContactsModal
          contacts={contacts}
          onClose={() => setContactsOpen(false)}
          onChange={setContacts}
        />
      )}
    </div>
  );
}

function FieldEditor({
  field, label, eyebrow, initial, currentValue, maxLength, onChange, onCancel, onSave,
}: {
  field: "name" | "phone";
  label: string;
  eyebrow: string;
  initial: string;
  currentValue: string;
  maxLength: number;
  onChange: (v: string) => void;
  onCancel: () => void;
  onSave: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const trimmed = initial.trim();
  // 昵称要求非空；手机号允许清空（从 abc → ""）
  const dirty = field === "name"
    ? (trimmed !== "" && trimmed !== currentValue)
    : (trimmed !== currentValue);

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-label={`修改${label}`}
      onClick={onCancel}
    >
      <div
        className="bg-surface rounded-2xl shadow-2xl p-6 w-[92vw] max-w-[400px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-display text-[calc(16px*var(--fz))] font-extrabold mb-1">修改{label}</div>
        <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold mb-4">
          {eyebrow}
        </div>

        <label className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold block mb-2">{label}</label>
        <input
          ref={inputRef}
          value={initial}
          maxLength={maxLength}
          inputMode={field === "phone" ? "tel" : undefined}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onSave(initial); }}
          className="w-full px-4 py-3 rounded-xl bg-canvas-2 border border-border font-medium text-[calc(14px*var(--fz))] focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/20"
          placeholder={currentValue || "—"}
        />
        <div className="mt-1 font-mono text-[calc(10px*var(--fz))] text-ink-soft font-bold">当前：{currentValue || "—"}</div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button className="btn-ghost py-2 px-4 text-[calc(12px*var(--fz))]" onClick={onCancel}>取消</button>
          <button
            className="btn-indigo py-2 px-4 text-[calc(12px*var(--fz))] disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!dirty}
            onClick={() => onSave(initial)}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

function CropOverlay({
  src, w, h, onCancel, onConfirm,
}: {
  src: string;
  w: number;
  h: number;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}) {
  const VIEWPORT = 360;
  const OUTPUT = 256;
  const baseScale = Math.max(VIEWPORT / w, VIEWPORT / h);
  const [zoom, setZoom] = useState(1);
  const totalScale = baseScale * zoom;
  const imgW = w * totalScale;
  const imgH = h * totalScale;

  const clamp = (x: number, y: number) => ({
    x: Math.min(0, Math.max(VIEWPORT - imgW, x)),
    y: Math.min(0, Math.max(VIEWPORT - imgH, y)),
  });

  const [offset, setOffset] = useState(() => ({
    x: (VIEWPORT - w * baseScale) / 2,
    y: (VIEWPORT - h * baseScale) / 2,
  }));

  const prevTotalRef = useRef(totalScale);
  useEffect(() => {
    const prev = prevTotalRef.current;
    if (prev === totalScale) return;
    setOffset((o) => {
      const cx = (VIEWPORT / 2 - o.x) / prev;
      const cy = (VIEWPORT / 2 - o.y) / prev;
      const next = { x: VIEWPORT / 2 - cx * totalScale, y: VIEWPORT / 2 - cy * totalScale };
      prevTotalRef.current = totalScale;
      return clamp(next.x, next.y);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalScale]);

  // 锁定 body 滚动；在裁剪区上 wheel 改缩放（非 passive 监听，能 preventDefault）
  const stageRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const el = stageRef.current;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => {
        const next = z * (e.deltaY < 0 ? 1.08 : 1 / 1.08);
        return Math.min(6, Math.max(1, next));
      });
    };
    el?.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      document.body.style.overflow = prevOverflow;
      el?.removeEventListener("wheel", onWheel);
    };
  }, []);

  const dragRef = useRef<{ sx: number; sy: number; bx: number; by: number; pid: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { sx: e.clientX, sy: e.clientY, bx: offset.x, by: offset.y, pid: e.pointerId };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setOffset(clamp(d.bx + (e.clientX - d.sx), d.by + (e.clientY - d.sy)));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    try { (e.target as Element).releasePointerCapture(dragRef.current.pid); } catch {}
    dragRef.current = null;
    setDragging(false);
  };

  const confirm = () => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const srcSize = VIEWPORT / totalScale;
      const srcX = -offset.x / totalScale;
      const srcY = -offset.y / totalScale;
      ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT, OUTPUT);
      onConfirm(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => onCancel();
    img.src = src;
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center gap-5 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-label="裁剪头像"
      onClick={onCancel}
    >
      <div
        className="font-mono text-[calc(11px*var(--fz))] uppercase tracking-[0.18em] font-bold text-white/70 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        滚轮缩放 · 拖动定位 · {zoom.toFixed(2)}×
      </div>

      <div
        ref={stageRef}
        className="relative overflow-hidden select-none touch-none"
        style={{
          width: VIEWPORT,
          height: VIEWPORT,
          borderRadius: 28,
          cursor: dragging ? "grabbing" : "grab",
          boxShadow: "0 25px 60px rgba(0,0,0,0.55)",
          background: "rgba(0,0,0,0.4)",
        }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img
          src={src}
          alt="待裁剪"
          draggable={false}
          style={{
            position: "absolute",
            left: offset.x,
            top: offset.y,
            width: imgW,
            height: imgH,
            maxWidth: "none",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: 28,
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.55), inset 0 0 0 2px rgba(0,0,0,0.3)",
          }}
        />
      </div>

      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <button
          className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-[calc(13px*var(--fz))] backdrop-blur"
          onClick={onCancel}
        >
          取消
        </button>
        <button
          className="px-5 py-2 rounded-full text-white font-bold text-[calc(13px*var(--fz))] shadow-md"
          style={{ background: "var(--indigo)" }}
          onClick={confirm}
        >
          确定
        </button>
      </div>
    </div>
  );
}

function Security() {
  const toast = useToast();
  const [pwOpen, setPwOpen] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const [revokingAll, setRevokingAll] = useState(false);

  const handleRevokeOthers = async () => {
    if (!window.confirm("确定要注销除当前设备外的所有登录会话？")) return;
    setRevokingAll(true);
    try {
      const r = await api.sessions.revokeOthers();
      toast("success", r.revoked > 0 ? `已注销 ${r.revoked} 个其它会话` : "没有其它在线会话");
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "注销失败");
    } finally {
      setRevokingAll(false);
    }
  };

  return (
    <div>
      <div className="mb-6 p-4 rounded-2xl" style={{ background: "var(--mint-soft)" }}>
        <div className="flex items-center gap-2 font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] font-bold text-mint-deep mb-1">
          <CheckCircle2 size={13} /> 账户安全等级：高
        </div>
        <div className="text-[calc(12px*var(--fz))] text-mint-deep font-semibold">
          已启用指纹登录 + 短信二次验证，近期无异常登录。
        </div>
      </div>

      <Row label="登录密码" desc="点击修改你的登录密码">
        <button
          type="button"
          className="btn-ghost py-2 px-3 text-[calc(12px*var(--fz))]"
          onClick={() => setPwOpen(true)}
        >
          <Key size={12} /> 修改密码
        </button>
      </Row>
      <Row label="指纹登录" desc="在支持的设备上快速登录">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] font-bold text-mint-deep flex items-center gap-1">
            <Fingerprint size={12} /> 已启用
          </span>
          <Toggle storageKey="security.fingerprint" defaultChecked />
        </div>
      </Row>
      <Row label="活体人脸" desc="高危操作前自动触发">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] font-bold text-ink-soft flex items-center gap-1">
            <ScanFace size={12} /> 可选
          </span>
          <Toggle storageKey="security.faceLiveness" />
        </div>
      </Row>
      <Row label="二次验证" desc="登录时向手机发送动态码">
        <Toggle storageKey="security.twoFactor" defaultChecked />
      </Row>
      <Row label="信任的设备" desc="查看并管理已登录的设备">
        <button
          type="button"
          className="btn-ghost py-2 px-3 text-[calc(12px*var(--fz))]"
          onClick={() => setDevOpen(true)}
        >
          <Smartphone size={12} /> 管理设备
        </button>
      </Row>
      <Row label="退出全部会话" desc="立即注销除当前外的所有设备">
        <button
          type="button"
          className="btn-ghost py-2 px-3 text-[calc(12px*var(--fz))] disabled:opacity-50"
          style={{ color: "var(--coral-deep)", borderColor: "var(--coral-soft)" }}
          onClick={handleRevokeOthers}
          disabled={revokingAll}
        >
          <LogOut size={12} /> {revokingAll ? "注销中…" : "注销"}
        </button>
      </Row>

      {pwOpen && <ChangePasswordModal onClose={() => setPwOpen(false)} />}
      {devOpen && <SessionsModal onClose={() => setDevOpen(false)} />}
    </div>
  );
}

function Notify() {
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {[
          { k: "APP 推送", sk: "push", icon: Bell, on: true, tint: "var(--indigo)", soft: "var(--indigo-soft)" },
          { k: "短信", sk: "sms", icon: Smartphone, on: true, tint: "var(--mint-deep)", soft: "var(--mint-soft)" },
          { k: "邮件", sk: "email", icon: User, on: false, tint: "var(--amber-deep)", soft: "var(--amber-soft)" },
        ].map((c) => (
          <div key={c.k} className="p-4 rounded-2xl border border-border">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: c.soft, color: c.tint }}>
                <c.icon size={15} />
              </div>
              <Toggle storageKey={`notify.channel.${c.sk}`} defaultChecked={c.on} />
            </div>
            <div className="mt-3 font-display text-[calc(14px*var(--fz))] font-extrabold">{c.k}</div>
            <div className="mt-0.5 font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.12em] text-ink-soft font-bold">
              {c.on ? "已启用" : "未启用"}
            </div>
          </div>
        ))}
      </div>

      <Row label="高危拦截" desc="AI 合成 / 话术命中 / 信令伪冒">
        <Toggle storageKey="notify.highRisk" defaultChecked />
      </Row>
      <Row label="家属同步" desc="同时推送给紧急联系人">
        <Toggle storageKey="notify.familySync" defaultChecked />
      </Row>
      <Row label="白名单变动" desc="新增或移除时通知">
        <Toggle storageKey="notify.whitelistChange" />
      </Row>
      <Row label="静音时段" desc="工作日 22:00 - 次日 07:00">
        <button className="btn-ghost py-2 px-3 text-[calc(12px*var(--fz))]">调整</button>
      </Row>
      <Row label="周报邮件" desc="每周一早上 09:00 送达">
        <Toggle storageKey="notify.weeklyReport" defaultChecked />
      </Row>
    </div>
  );
}

function Appearance() {
  const { theme, setTheme } = useTheme();
  const { care, inc, dec, reset, setCare, canInc, canDec } = useFontSize();
  const { density, reduceMotion, setDensity, setReduceMotion } = useAppearance();
  const { lang, setLang, t } = useLang();

  const DENSITY_OPTS: { k: Density; label: string }[] = [
    { k: "compact", label: t("紧凑") },
    { k: "normal", label: t("标准") },
    { k: "loose", label: t("宽松") },
  ];

  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold mb-3">{t("主题")}</div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { k: "light", label: t("浅色"), grad: "linear-gradient(135deg, #F2F3F7, #FFFFFF)" },
            { k: "dark", label: t("深色"), grad: "linear-gradient(135deg, #14141A, #08080B)" },
            { k: "auto", label: t("跟随系统"), grad: "linear-gradient(135deg, #F2F3F7 50%, #14141A 50%)" },
          ].map((opt) => {
            const active = theme === opt.k;
            return (
              <button
                key={opt.k}
                onClick={() => setTheme(opt.k as "light" | "dark" | "auto")}
                className="p-3 rounded-2xl border-2 text-left transition-all"
                style={{ borderColor: active ? "var(--indigo)" : "var(--border)" }}
              >
                <div className="h-20 rounded-xl border border-border" style={{ background: opt.grad }} />
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-display text-[calc(13px*var(--fz))] font-extrabold">{opt.label}</span>
                  {active && <CheckCircle2 size={14} style={{ color: "var(--indigo)" }} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Row label={t("界面密度")} desc={t("紧凑模式可在小屏幕上显示更多")}>
        <div className="flex items-center gap-1 p-1 rounded-full bg-canvas-2 border border-border">
          {DENSITY_OPTS.map((opt) => {
            const active = density === opt.k;
            return (
              <button
                key={opt.k}
                onClick={() => setDensity(opt.k)}
                className="px-3 py-1 rounded-full text-[calc(12px*var(--fz))] font-bold transition-colors"
                aria-pressed={active}
                style={{
                  background: active ? "var(--surface)" : "transparent",
                  color: active ? "var(--ink)" : "var(--ink-soft)",
                  boxShadow: active ? "var(--shadow-xs)" : "none",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </Row>

      <Row label={t("字号")} desc={t("点击 A- / A+ 微调，A 重置为默认")}>
        <div className="flex items-center gap-1 p-1 rounded-full bg-canvas-2 border border-border">
          <button
            onClick={dec}
            disabled={!canDec}
            className="w-9 py-1 rounded-full text-[calc(12px*var(--fz))] font-extrabold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "transparent", color: "var(--ink-soft)" }}
            aria-label={t("缩小字号")}
          >
            A-
          </button>
          <button
            onClick={reset}
            className="w-9 py-1 rounded-full text-[calc(12px*var(--fz))] font-extrabold transition-colors"
            style={{
              background: "var(--surface)",
              color: "var(--ink)",
              boxShadow: "var(--shadow-xs)",
            }}
            aria-label={t("重置字号")}
          >
            A
          </button>
          <button
            onClick={inc}
            disabled={!canInc}
            className="w-9 py-1 rounded-full text-[calc(12px*var(--fz))] font-extrabold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "transparent", color: "var(--ink-soft)" }}
            aria-label={t("放大字号")}
          >
            A+
          </button>
        </div>
      </Row>

      <Row label={t("关怀模式")} desc={t("为视力不便的用户提供更大字号")}>
        <button
          onClick={() => setCare(!care)}
          className="relative w-11 h-6 rounded-full transition-colors"
          style={{ background: care ? "var(--indigo)" : "var(--canvas-3)" }}
          aria-pressed={care}
          aria-label={t("关怀模式开关")}
        >
          <span
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
            style={{
              left: care ? "calc(100% - 1.375rem)" : "0.125rem",
              boxShadow: "var(--shadow-xs)",
            }}
          />
        </button>
      </Row>

      <Row label={t("语言")} desc="Language / 語言">
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
          className="px-4 py-2.5 rounded-xl bg-surface border border-border font-medium text-[calc(13px*var(--fz))] focus:outline-none focus:border-indigo"
        >
          <option value="zh-CN">简体中文</option>
          <option value="en">English</option>
          <option value="zh-TW">繁體中文</option>
        </select>
      </Row>

      <Row label={t("降低动画")} desc={t("减少过渡动效，缓解晕动症")}>
        <button
          onClick={() => setReduceMotion(!reduceMotion)}
          className="relative w-11 h-6 rounded-full transition-colors"
          style={{ background: reduceMotion ? "var(--indigo)" : "var(--canvas-3)" }}
          aria-pressed={reduceMotion}
          aria-label={t("降低动画开关")}
        >
          <span
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
            style={{
              left: reduceMotion ? "calc(100% - 1.375rem)" : "0.125rem",
              boxShadow: "var(--shadow-xs)",
            }}
          />
        </button>
      </Row>
    </div>
  );
}

function EmergencyContactsModal({
  contacts,
  onClose,
  onChange,
}: {
  contacts: EmergencyContact[];
  onClose: () => void;
  onChange: (next: EmergencyContact[]) => void;
}) {
  const toast = useToast();
  type Draft = { name: string; phone: string; relation: string };
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>({ name: "", phone: "", relation: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (editingId !== null) setEditingId(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingId, onClose]);

  const startNew = () => {
    setDraft({ name: "", phone: "", relation: "" });
    setEditingId("new");
  };
  const startEdit = (c: EmergencyContact) => {
    setDraft({ name: c.name, phone: c.phone, relation: c.relation });
    setEditingId(c.id);
  };

  const validate = (d: Draft): string | null => {
    const name = d.name.trim();
    const phone = d.phone.trim();
    if (!name) return "请填写姓名";
    if (name.length > 32) return "姓名最多 32 字";
    if (!phone) return "请填写手机号";
    if (phone.length > 20) return "手机号最多 20 位";
    if (d.relation.trim().length > 16) return "关系最多 16 字";
    return null;
  };

  const save = async () => {
    const errMsg = validate(draft);
    if (errMsg) { toast("error", errMsg); return; }
    const payload = {
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      relation: draft.relation.trim(),
    };
    setSubmitting(true);
    try {
      if (editingId === "new") {
        const created = await api.emergencyContacts.create(payload);
        onChange([...contacts, created]);
        toast("success", "已添加紧急联系人");
      } else if (editingId) {
        const updated = await api.emergencyContacts.update(editingId, payload);
        onChange(contacts.map((c) => (c.id === updated.id ? updated : c)));
        toast("success", "已更新");
      }
      setEditingId(null);
    } catch (e) {
      const msg = e instanceof APIError
        ? (e.code === "EMERGENCY_CONTACT_DUPLICATE" ? "该号码已在列表中" : e.message)
        : "保存失败";
      toast("error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (c: EmergencyContact) => {
    if (!window.confirm(`删除紧急联系人「${c.name}」？`)) return;
    try {
      await api.emergencyContacts.remove(c.id);
      onChange(contacts.filter((x) => x.id !== c.id));
      toast("info", "已删除");
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "删除失败");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-label="管理紧急联系人"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl shadow-2xl w-[92vw] max-w-[520px] max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-4 border-b border-border">
          <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">EMERGENCY CONTACTS</div>
          <div className="font-display text-[calc(18px*var(--fz))] font-extrabold mt-1">紧急联系人</div>
          <div className="mt-1 text-[calc(12px*var(--fz))] text-ink-soft font-medium">
            发生拦截时，告警将同时推送给以下联系人。最多建议 5 位。
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {contacts.length === 0 && editingId === null && (
            <div className="py-10 text-center font-mono text-[calc(11px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">
              暂无联系人
            </div>
          )}

          <div className="space-y-2">
            {contacts.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-2xl border border-border">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "var(--coral-soft)", color: "var(--coral-deep)" }}
                >
                  <Phone size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-[calc(14px*var(--fz))] font-extrabold truncate">
                    {c.name}
                    {c.relation && (
                      <span className="ml-2 font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.12em] text-ink-soft font-bold">
                        {c.relation}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 font-mono text-[calc(11px*var(--fz))] text-ink-soft font-bold truncate">{c.phone}</div>
                </div>
                <button
                  className="btn-ghost py-1.5 px-2.5 text-[calc(12px*var(--fz))]"
                  onClick={() => startEdit(c)}
                  aria-label="编辑"
                  title="编辑"
                >
                  <Pencil size={12} />
                </button>
                <button
                  className="btn-ghost py-1.5 px-2.5 text-[calc(12px*var(--fz))]"
                  style={{ color: "var(--coral-deep)", borderColor: "var(--coral-soft)" }}
                  onClick={() => remove(c)}
                  aria-label="删除"
                  title="删除"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          {editingId !== null && (
            <div className="mt-4 p-4 rounded-2xl bg-canvas-2 border border-border">
              <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold mb-3">
                {editingId === "new" ? "ADD CONTACT" : "EDIT CONTACT"}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold block mb-1.5">姓名</label>
                  <input
                    autoFocus
                    value={draft.name}
                    maxLength={32}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border font-medium text-[calc(13px*var(--fz))] focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/20"
                    placeholder="例如：母亲"
                  />
                </div>
                <div>
                  <label className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold block mb-1.5">手机号</label>
                  <input
                    value={draft.phone}
                    maxLength={20}
                    inputMode="tel"
                    onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border font-medium text-[calc(13px*var(--fz))] focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/20"
                    placeholder="13800001111"
                  />
                </div>
                <div>
                  <label className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold block mb-1.5">关系（可选）</label>
                  <input
                    value={draft.relation}
                    maxLength={16}
                    onChange={(e) => setDraft((d) => ({ ...d, relation: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border font-medium text-[calc(13px*var(--fz))] focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/20"
                    placeholder="子女 / 配偶 / 朋友"
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  className="btn-ghost py-2 px-4 text-[calc(12px*var(--fz))]"
                  onClick={() => setEditingId(null)}
                  disabled={submitting}
                >
                  取消
                </button>
                <button
                  className="btn-indigo py-2 px-4 text-[calc(12px*var(--fz))] disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={save}
                  disabled={submitting}
                >
                  {submitting ? "保存中…" : "保存"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex items-center justify-between gap-3">
          <button
            className="btn-ghost py-2 px-3 text-[calc(12px*var(--fz))]"
            onClick={startNew}
            disabled={editingId === "new"}
          >
            + 添加联系人
          </button>
          <button className="btn-indigo py-2 px-4 text-[calc(12px*var(--fz))]" onClick={onClose}>
            完成
          </button>
        </div>
      </div>
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const strength: { label: string; color: string } = (() => {
    const v = newPw;
    if (v.length === 0) return { label: "—", color: "var(--ink-soft)" };
    let s = 0;
    if (v.length >= 8) s++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
    if (/\d/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v)) s++;
    if (s <= 1) return { label: "弱", color: "var(--coral-deep)" };
    if (s === 2) return { label: "中", color: "var(--amber-deep)" };
    if (s === 3) return { label: "强", color: "var(--mint-deep)" };
    return { label: "极强", color: "var(--mint-deep)" };
  })();

  const submit = async () => {
    if (!oldPw) { toast("error", "请输入当前密码"); return; }
    if (newPw.length < 6) { toast("error", "新密码至少 6 位"); return; }
    if (newPw.length > 64) { toast("error", "新密码最多 64 位"); return; }
    if (newPw !== confirmPw) { toast("error", "两次输入不一致"); return; }
    if (newPw === oldPw) { toast("error", "新密码不能与当前密码相同"); return; }

    setSubmitting(true);
    try {
      await api.changePassword(oldPw, newPw);
      toast("success", "密码已更新");
      onClose();
    } catch (e) {
      const msg = e instanceof APIError
        ? (e.code === "AUTH_BAD_PASSWORD" ? "当前密码不正确" : e.message)
        : "更新失败";
      toast("error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog" aria-label="修改密码" onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl shadow-2xl w-[92vw] max-w-[440px] max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-4 border-b border-border">
          <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">CHANGE PASSWORD</div>
          <div className="font-display text-[calc(18px*var(--fz))] font-extrabold mt-1">修改登录密码</div>
        </div>
        <div className="p-6 space-y-4">
          <SettingsField label="当前密码">
            <input type="password" autoFocus value={oldPw} onChange={(e) => setOldPw(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-canvas-2 border border-border font-medium text-[calc(13px*var(--fz))] focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/20" />
          </SettingsField>
          <SettingsField label="新密码">
            <input type="password" value={newPw} maxLength={64} onChange={(e) => setNewPw(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-canvas-2 border border-border font-medium text-[calc(13px*var(--fz))] focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/20" />
            <div className="mt-1.5 font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] font-bold" style={{ color: strength.color }}>
              强度：{strength.label}
            </div>
          </SettingsField>
          <SettingsField label="确认新密码">
            <input type="password" value={confirmPw} maxLength={64} onChange={(e) => setConfirmPw(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-canvas-2 border border-border font-medium text-[calc(13px*var(--fz))] focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/20" />
          </SettingsField>
        </div>
        <div className="p-4 border-t border-border flex items-center justify-end gap-2">
          <button className="btn-ghost py-2 px-4 text-[calc(12px*var(--fz))]" onClick={onClose} disabled={submitting}>取消</button>
          <button className="btn-indigo py-2 px-4 text-[calc(12px*var(--fz))] disabled:opacity-50" onClick={submit} disabled={submitting}>
            {submitting ? "提交中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function SessionsModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [rows, setRows] = useState<SessionView[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try {
      const r = await api.sessions.list();
      setRows(r ?? []);
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "加载失败");
      setRows([]);
    }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const revokeOne = async (token: string, label: string) => {
    if (!window.confirm(`注销「${label}」？该设备需重新登录。`)) return;
    setBusy(token);
    try {
      await api.sessions.revoke(token);
      setRows((rs) => (rs ?? []).filter((s) => s.token !== token));
      toast("info", "已注销");
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "注销失败");
    } finally {
      setBusy(null);
    }
  };

  const fmtTime = (s: string) => {
    try {
      const d = new Date(s);
      const now = Date.now();
      const diff = (now - d.getTime()) / 1000;
      if (diff < 60) return "刚刚";
      if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
      if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
      return d.toLocaleString("zh-CN", { hour12: false });
    } catch { return s; }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog" aria-label="管理登录设备" onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl shadow-2xl w-[92vw] max-w-[560px] max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-4 border-b border-border">
          <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">DEVICES &amp; SESSIONS</div>
          <div className="font-display text-[calc(18px*var(--fz))] font-extrabold mt-1">登录设备</div>
          <div className="mt-1 text-[calc(12px*var(--fz))] text-ink-soft font-medium">
            每条会话对应一次登录。注销后该设备需要重新输入密码。
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {rows === null && (
            <div className="py-10 text-center font-mono text-[calc(11px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">加载中…</div>
          )}
          {rows && rows.length === 0 && (
            <div className="py-10 text-center font-mono text-[calc(11px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">暂无活动会话</div>
          )}
          <div className="space-y-2">
            {(rows ?? []).map((s) => (
              <div key={s.token} className="flex items-center gap-3 p-3 rounded-2xl border border-border">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: s.current ? "var(--mint-soft)" : "var(--canvas-2)", color: s.current ? "var(--mint-deep)" : "var(--ink-soft)" }}
                >
                  <Smartphone size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-[calc(14px*var(--fz))] font-extrabold truncate flex items-center gap-2">
                    <span className="truncate">{s.deviceLabel || "未知设备"}</span>
                    {s.current && (
                      <span className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.12em] text-mint-deep font-bold shrink-0">当前</span>
                    )}
                  </div>
                  <div className="mt-0.5 font-mono text-[calc(11px*var(--fz))] text-ink-soft font-bold truncate">
                    {s.ip || "未知 IP"} · 活跃于 {fmtTime(s.lastSeenAt)}
                  </div>
                </div>
                {!s.current && (
                  <button
                    className="btn-ghost py-1.5 px-2.5 text-[calc(12px*var(--fz))] disabled:opacity-50"
                    style={{ color: "var(--coral-deep)", borderColor: "var(--coral-soft)" }}
                    onClick={() => revokeOne(s.token, s.deviceLabel || "未知设备")}
                    disabled={busy === s.token}
                    title="注销此设备"
                  >
                    {busy === s.token ? "…" : "注销"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-border flex items-center justify-end">
          <button className="btn-indigo py-2 px-4 text-[calc(12px*var(--fz))]" onClick={onClose}>完成</button>
        </div>
      </div>
    </div>
  );
}
