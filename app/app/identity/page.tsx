"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/shared/PageHeader";
import FormRow from "@/components/shared/FormRow";
import Toggle from "@/components/shared/Toggle";
import { useToast } from "@/components/shared/Toast";
import { FAMILY_NAV } from "@/lib/nav";
import { useLocalStorage } from "@/lib/storage";
import { api, APIError } from "@/lib/api";
import { useSingle } from "@/lib/use-resource";
import { Smartphone, IdCard, BookOpen, ShieldCheck, Plane, CheckCircle2, ScanFace, Users, Heart, X, Image as ImageIcon } from "lucide-react";

type CredKey = "phone" | "id" | "passport" | "military" | "hkmo";

const CREDS: { k: CredKey; label: string; icon: any; example: string }[] = [
  { k: "phone", label: "手机号", icon: Smartphone, example: "138 0013 4921" },
  { k: "id", label: "身份证", icon: IdCard, example: "110101 ···· 1234" },
  { k: "passport", label: "护照", icon: BookOpen, example: "E12345678" },
  { k: "military", label: "军人证", icon: ShieldCheck, example: "军 / 武警证号" },
  { k: "hkmo", label: "港澳台居民证", icon: Plane, example: "港澳台居民居住证号" },
];

type StoredPhoto = { slot: string; name: string; size: number; mime: string; dataUrl: string; updatedAt: string };
type StoredCredential = { kind: CredKey; masked?: string; verified?: boolean; photos?: StoredPhoto[]; updatedAt?: string };

const MODE_KEYS = ["offline", "relative", "care"] as const;

export default function IdentityPage() {
  const toast = useToast();
  const [tab, setTab] = useState<CredKey>("phone");
  const credsRes = useSingle<any[]>(() => api.credentials.list());
  const modesRes = useSingle<any[]>(() => api.credentials.getModes());

  // 乐观叠加：本地修改（删档/删图）立即生效，等下次 refresh 拉到新数据自然清空。
  // null = 未触发；其它值会覆盖 credsRes.data 中对应 kind 的记录。
  const [overrides, setOverrides] = useState<Record<string, StoredCredential | null>>({});

  // 前端输入：当前 tab 的姓名/号码
  const [nameInput, setNameInput] = useState("");
  const [valueInput, setValueInput] = useState("");

  // 证件图片：File 持有 + dataUrl 预览，提交时通过 multipart 上送
  type Pic = { file: File; dataUrl: string };
  const [pics, setPics] = useState<Record<string, Pic>>({});

  const acceptPic = (slot: string, file: File | null | undefined) => {
    if (!file) return;
    if (!/^image\/(jpeg|png)$/.test(file.type)) {
      toast("error", "仅支持 JPG / PNG");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast("error", "图片需 ≤ 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPics(prev => ({ ...prev, [slot]: { file, dataUrl: reader.result as string } }));
    };
    reader.onerror = () => toast("error", "图片读取失败");
    reader.readAsDataURL(file);
  };
  const clearPic = (slot: string) => setPics(prev => {
    const next = { ...prev };
    delete next[slot];
    return next;
  });

  // 切换 tab 时清空输入与图片
  useEffect(() => {
    setNameInput("");
    setValueInput("");
    setPics({});
  }, [tab]);

  // UI 偏好仍保留 localStorage（与后端 modes 区分）
  const [uiOffline, setUiOffline] = useLocalStorage("identity.offline", false);
  const [uiRelative, setUiRelative] = useLocalStorage("identity.relative", true);
  const [uiCare, setUiCare] = useLocalStorage("identity.care", false);

  const credByKind = useMemo<Record<string, StoredCredential>>(() => {
    const m: Record<string, StoredCredential> = {};
    for (const c of (credsRes.data as StoredCredential[] | null) || []) {
      if (c?.kind) m[c.kind] = c;
    }
    // overrides 优先：null 表示删除，对象表示替换
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null) delete m[k];
      else m[k] = v;
    }
    return m;
  }, [credsRes.data, overrides]);

  // 当后端最新数据回流时清掉所有 override，避免旧覆盖盖住新真值。
  useEffect(() => { setOverrides({}); }, [credsRes.data]);

  const verified = useMemo<Record<CredKey, boolean>>(() => {
    const m: Record<CredKey, boolean> = {
      phone: false, id: false, passport: false, military: false, hkmo: false,
    };
    for (const c of (credsRes.data as StoredCredential[] | null) || []) {
      if (c?.kind && c.kind in m) m[c.kind] = !!c.verified;
    }
    return m;
  }, [credsRes.data]);

  // 后端 modes -> 优先用后端值，未返回时回退 UI 偏好
  const modesMap = useMemo<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    for (const it of modesRes.data || []) {
      if (it?.key) m[it.key] = !!it.enabled;
    }
    return m;
  }, [modesRes.data]);

  const offline = modesMap.offline ?? uiOffline;
  const relative = modesMap.relative ?? uiRelative;
  const care = modesMap.care ?? uiCare;

  const updateMode = async (key: "offline" | "relative" | "care", enabled: boolean) => {
    // 同步 UI 偏好（用户的 boolean UI 偏好）
    if (key === "offline") setUiOffline(enabled);
    if (key === "relative") setUiRelative(enabled);
    if (key === "care") setUiCare(enabled);

    try {
      const next = MODE_KEYS.map((k) => ({
        key: k,
        enabled: k === key ? enabled : (modesMap[k] ?? (k === "offline" ? uiOffline : k === "relative" ? uiRelative : uiCare)),
      }));
      await api.credentials.setModes(next);
      modesRes.refresh();
    } catch (e) {
      toast("error", e instanceof APIError ? e.message : "保存失败");
    }
  };

  const verifyOne = async (k: CredKey) => {
    console.log("[identity] verifyOne start", { kind: k, value: valueInput, pics: Object.keys(pics) });
    if (!valueInput.trim()) {
      toast("error", "请填写证件号");
      return;
    }
    const requiredSlots: ("face" | "emblem" | "main")[] =
      k === "id" ? ["face", "emblem"]
      : k === "phone" ? []
      : ["main"];
    const missing = requiredSlots.filter(s => !pics[s]);
    if (missing.length > 0) {
      toast("error", k === "id" ? "请上传人像面与国徽面照片" : "请上传证件照片");
      return;
    }
    try {
      // verified=false：后端会 hash 存储；后续接 OCR 后服务端置 true
      await api.credentials.submit(k, valueInput.trim(), false);
      for (const slot of requiredSlots) {
        const pic = pics[slot];
        if (!pic) continue;
        await api.credentials.upload(k, slot, pic.file);
      }
      toast(
        "success",
        "认证已提交",
        requiredSlots.length > 0 ? "证件号与照片已写入" : "证件号已写入",
      );
      setNameInput("");
      setValueInput("");
      setPics({});
      credsRes.refresh();
    } catch (e) {
      console.error("[identity] verifyOne failed", e);
      toast("error", e instanceof APIError ? e.message : "提交失败");
    }
  };

  return (
    <AppShell role="family" userName="王磊" nav={FAMILY_NAV} breadcrumb={["SENTINEL", "家庭用户", "身份认证"]}>
      <PageHeader
        eyebrow="IDENTITY"
        title="身份认证"
        desc="多源证件实名 + 线下 / 亲属 / 关怀模式，建立可追溯的本机身份档案。"
      />

      {/* 状态卡片 */}
      <div className="stagger grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {CREDS.map((c) => {
          const stored = credByKind[c.k];
          const state: "none" | "pending" | "ok" =
            !stored ? "none" : stored.verified ? "ok" : "pending";
          const palette =
            state === "ok"
              ? { bg: "var(--mint-soft)", fg: "var(--mint-deep)", label: "已认证" }
              : state === "pending"
              ? { bg: "var(--amber-soft)", fg: "var(--amber-deep)", label: "待核验" }
              : { bg: "var(--canvas-2)", fg: "var(--ink-soft)", label: "未认证" };
          return (
            <div key={c.k} className="panel p-4">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
                style={{ background: palette.bg, color: palette.fg }}
              >
                <c.icon size={14} />
              </div>
              <div className="font-display text-[13px] font-extrabold truncate">{c.label}</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] font-bold" style={{ color: palette.fg }}>
                {palette.label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-12 gap-5">
        <section className="col-span-12 lg:col-span-7 panel p-6">
          <div className="flex items-center gap-1 p-1 rounded-full bg-canvas-2 border border-border mb-6 overflow-x-auto">
            {CREDS.map((c) => {
              const active = c.k === tab;
              return (
                <button
                  key={c.k}
                  onClick={() => setTab(c.k)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold transition-colors whitespace-nowrap"
                  style={{
                    background: active ? "var(--surface)" : "transparent",
                    color: active ? "var(--ink)" : "var(--ink-soft)",
                    boxShadow: active ? "var(--shadow-sm)" : "none",
                  }}
                >
                  <c.icon size={12} />
                  {c.label}
                </button>
              );
            })}
          </div>

          {(() => {
            const cur = CREDS.find((c) => c.k === tab)!;
            return (
              <div key={tab} className="fade-in">
                <div className="font-display text-[18px] font-extrabold mb-1">{cur.label} 认证</div>
                <p className="text-[13px] text-ink-soft font-medium mb-5">
                  填写或拍照上传后，调用公安身份信息核验接口异步比对。
                </p>

                <div className="space-y-4">
                  <Field label="姓名">
                    <input className="ipt" placeholder="张三" value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
                  </Field>
                  <Field label={cur.label + " 号"}>
                    <input className="ipt" placeholder={cur.example} value={valueInput} onChange={(e) => setValueInput(e.target.value)} />
                  </Field>
                  {tab === "id" && (
                    <div className="grid grid-cols-2 gap-3">
                      <PicSlot
                        slot="face"
                        label="人像面"
                        pic={pics.face}
                        onPick={(f) => acceptPic("face", f)}
                        onClear={() => clearPic("face")}
                      />
                      <PicSlot
                        slot="emblem"
                        label="国徽面"
                        pic={pics.emblem}
                        onPick={(f) => acceptPic("emblem", f)}
                        onClear={() => clearPic("emblem")}
                      />
                    </div>
                  )}
                  {(tab === "passport" || tab === "military" || tab === "hkmo") && (
                    <Field label="证件照片">
                      <PicSlot
                        slot="main"
                        label={cur.label}
                        pic={pics.main}
                        onPick={(f) => acceptPic("main", f)}
                        onClear={() => clearPic("main")}
                        large
                      />
                    </Field>
                  )}

                  {credByKind[cur.k] && (
                    <SubmittedRecord
                      record={credByKind[cur.k]}
                      onRemoveAll={async () => {
                        const before = credByKind[cur.k];
                        setOverrides(prev => ({ ...prev, [cur.k]: null }));
                        try {
                          await api.credentials.remove(cur.k);
                          credsRes.refresh();
                          toast("info", "已删除该认证");
                        } catch (e) {
                          setOverrides(prev => ({ ...prev, [cur.k]: before }));
                          toast("error", e instanceof APIError ? e.message : "删除失败");
                        }
                      }}
                    />
                  )}

                  <button type="button" onClick={() => verifyOne(cur.k)} className="btn-indigo w-full justify-center py-3 text-[14px]" style={{ width: "100%" }}>
                    {verified[cur.k] ? <CheckCircle2 size={14} /> : <ScanFace size={14} />}
                    {verified[cur.k] ? "重新提交认证" : "提交认证"}
                  </button>
                </div>
              </div>
            );
          })()}
        </section>

        <section className="col-span-12 lg:col-span-5 space-y-3 stagger">
          <div className="panel p-6">
            <div className="font-display text-[16px] font-extrabold mb-1">认证模式</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold mb-3">VERIFICATION MODE</div>
            <FormRow label="线下认证" desc="对接公安政务大厅人工核验，72 小时内回执">
              <Toggle checked={offline} onChange={(v) => updateMode("offline", v)} />
            </FormRow>
            <FormRow label="亲属认证" desc="允许已认证亲属为我担保，适用老人 / 儿童">
              <Toggle checked={relative} onChange={(v) => updateMode("relative", v)} />
            </FormRow>
            <FormRow label="关怀模式" desc="放大字体、简化操作、亲属同步重要告警">
              <Toggle checked={care} onChange={(v) => updateMode("care", v)} />
            </FormRow>
          </div>

          <div className="panel p-6" style={{ background: "linear-gradient(135deg, var(--indigo-soft), var(--mint-soft))" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm">
                <Heart size={16} style={{ color: "var(--coral)" }} />
              </div>
              <div>
                <div className="font-display text-[14px] font-extrabold">关怀模式特性</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">FOR ELDERS</div>
              </div>
            </div>
            <ul className="space-y-2 text-[13px] font-medium text-ink-2">
              <li className="flex items-center gap-2"><Users size={12} style={{ color: "var(--indigo)" }} /> 来电警示自动同步儿女</li>
              <li className="flex items-center gap-2"><ShieldCheck size={12} style={{ color: "var(--mint-deep)" }} /> 转账类话术自动挂断 + 弹屏</li>
              <li className="flex items-center gap-2"><BookOpen size={12} style={{ color: "var(--amber-deep)" }} /> 大字模式 + 反诈语音助手</li>
            </ul>
          </div>
        </section>
      </div>

      <style>{`
        .ipt { width: 100%; padding: 12px 14px; border-radius: 14px; border: 1px solid var(--border); background: var(--surface); font-size: 13px; font-weight: 500; }
        .ipt:focus { outline: none; border-color: var(--indigo); box-shadow: 0 0 0 3px color-mix(in srgb, var(--indigo) 18%, transparent); }
      `}</style>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function SubmittedRecord({
  record, onRemoveAll,
}: {
  record: StoredCredential;
  onRemoveAll: () => void;
}) {
  const ts = record.updatedAt ? new Date(record.updatedAt) : null;
  const tsLabel = ts && !Number.isNaN(ts.getTime()) ? ts.toLocaleString("zh-CN") : "—";
  const tone = record.verified
    ? { bg: "var(--mint-soft)", fg: "var(--mint-deep)", label: "已认证" }
    : { bg: "var(--amber-soft)", fg: "var(--amber-deep)", label: "待核验" };
  return (
    <div className="rounded-2xl border border-border bg-canvas-2 p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="px-2.5 py-1 rounded-full font-mono text-[10px] uppercase tracking-[0.14em] font-extrabold"
            style={{ background: tone.bg, color: tone.fg }}
          >
            {tone.label}
          </span>
          {record.masked && (
            <span className="font-mono text-[12px] font-extrabold truncate">{record.masked}</span>
          )}
        </div>
        <button
          onClick={onRemoveAll}
          className="text-[11px] font-bold text-ink-soft hover:text-ink"
        >
          删除该认证
        </button>
      </div>
      <div className="mt-1 font-mono text-[10px] text-ink-soft font-bold">最近更新 {tsLabel}</div>
      {record.photos && record.photos.length > 0 && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {record.photos.map((p) => (
            <div key={p.slot} className="relative rounded-xl overflow-hidden border border-border bg-surface">
              <img
                src={p.dataUrl}
                alt={`${p.slot} 已上传`}
                className="block w-full object-cover"
                style={{ aspectRatio: "16 / 10" }}
              />
              <div className="px-2 py-1.5 border-t border-border">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-ink-soft truncate">
                  {p.slot}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PicSlot({
  slot, label, pic, onPick, onClear, large,
}: {
  slot: string;
  label: string;
  pic?: { file: File; dataUrl: string };
  onPick: (f: File | null | undefined) => void;
  onClear: () => void;
  large?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const inputId = `pic-${slot}`;
  const sizeKB = pic ? (pic.file.size / 1024).toFixed(0) : "";
  const padding = large ? "p-5" : "p-4";
  const openPicker = () => inputRef.current?.click();
  const handlePick = (file: File | null | undefined) => {
    onPick(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  if (pic) {
    return (
      <div className={`relative rounded-2xl border border-border bg-canvas-2 overflow-hidden`}>
        <img
          src={pic.dataUrl}
          alt={`${label} 预览`}
          className="block w-full object-cover"
          style={{ aspectRatio: "16 / 10" }}
        />
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border bg-surface">
          <div className="min-w-0">
            <div className="font-display text-[12px] font-extrabold truncate">{label}</div>
            <div className="font-mono text-[10px] text-ink-soft font-bold truncate">{pic.file.name} · {sizeKB} KB</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={openPicker}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold border border-border hover:bg-canvas-2"
            >
              替换
            </button>
            <button
              type="button"
              onClick={onClear}
              className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-canvas-2"
              aria-label="移除图片"
              title="移除"
            >
              <X size={12} />
            </button>
          </div>
        </div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => handlePick(e.target.files?.[0])}
        />
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPicker();
        }
      }}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handlePick(e.dataTransfer.files?.[0]);
      }}
      className={`block ${padding} rounded-2xl border-2 border-dashed cursor-pointer text-center transition-colors`}
      style={{
        borderColor: drag ? "var(--indigo)" : "var(--border)",
        background: drag ? "color-mix(in srgb, var(--indigo) 8%, transparent)" : "transparent",
      }}
    >
      <ImageIcon size={large ? 26 : 22} className="mx-auto text-ink-soft mb-1" />
      <div className={`font-display ${large ? "text-[13px]" : "text-[12px]"} font-extrabold`}>
        上传{label}
      </div>
      <div className="font-mono text-[10px] text-ink-soft font-bold">JPG / PNG · ≤ 5MB</div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => handlePick(e.target.files?.[0])}
      />
    </div>
  );
}
