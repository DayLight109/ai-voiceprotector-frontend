"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  Fingerprint,
  Home,
  Image as ImageIcon,
  ScanFace,
  User,
  X,
} from "lucide-react";
import AuthShell from "@/components/AuthShell";
import { useToast } from "@/components/shared/Toast";
import { api, APIError } from "@/lib/api";
import { useAuth, roleHomePath } from "@/lib/auth";

type Step = 0 | 1 | 2 | 3 | 4;
type Role = "family" | "enterprise";
type IdCardSide = "front" | "back";
type UploadFile = { file: File; dataUrl: string };

const STEPS = [
  { k: 0, label: "Select Identity", icon: User },
  { k: 1, label: "Verify ID", icon: CreditCard },
  { k: 2, label: "Liveness", icon: Camera },
  { k: 3, label: "Fingerprint", icon: Fingerprint },
  { k: 4, label: "Complete", icon: CheckCircle2 },
] as const;

const ID_CARD_SIDES: { key: IdCardSide; label: string }[] = [
  { key: "front", label: "人像面" },
  { key: "back", label: "国徽面" },
];

export default function RegisterPage() {
  const toast = useToast();
  const { login } = useAuth();
  const [step, setStep] = useState<Step>(0);
  const [role, setRole] = useState<Role>("family");
  const [name, setName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [idImages, setIdImages] = useState<Partial<Record<IdCardSide, UploadFile>>>({});
  const [submitting, setSubmitting] = useState(false);

  // 后端角色取值是 family | biz；注册页的"企业用户"对应 biz
  const apiRole: "family" | "biz" = role === "enterprise" ? "biz" : "family";

  const validateStep1 = (): string | null => {
    if (!name.trim()) return "请输入姓名";
    if (!/^\d{17}[\dXx]$/.test(idNumber.replace(/\s/g, ""))) return "身份证号格式不正确（18 位）";
    if (!/^1\d{10}$/.test(phone.replace(/\s/g, ""))) return "请输入 11 位手机号";
    if (password.length < 6) return "密码至少 6 位";
    if (password !== password2) return "两次输入的密码不一致";
    if (!idImages.front || !idImages.back) return "请从电脑中选择身份证人像面和国徽面图片";
    return null;
  };

  // 真实注册：创建账号 → 自动登录 → 提交身份证号与正反面照片
  const submitRegistration = async (): Promise<boolean> => {
    const cleanPhone = phone.replace(/\s/g, "");
    setSubmitting(true);
    try {
      await api.register({
        name: name.trim(),
        phone: cleanPhone,
        password,
        role: apiRole,
      });
      await login(cleanPhone, password);
    } catch (e) {
      const msg =
        e instanceof APIError
          ? e.code === "USER_DUPLICATE"
            ? "该手机号已注册，可直接登录"
            : e.message || "注册失败，请稍后再试"
          : "网络异常，请稍后再试";
      toast("error", "注册失败", msg);
      setSubmitting(false);
      return false;
    }

    // 证件信息：失败不阻塞注册（可稍后在设置页补交）
    try {
      await api.credentials.submit("id_card", idNumber.replace(/\s/g, ""));
      if (idImages.front) await api.credentials.upload("id_card", "face", idImages.front.file);
      if (idImages.back) await api.credentials.upload("id_card", "emblem", idImages.back.file);
      toast("success", "注册成功", "账号已创建并登录，身份证资料已提交");
    } catch {
      toast("info", "账号已创建", "身份证资料提交失败，可稍后在「设置 → 身份认证」中补交");
    }
    setSubmitting(false);
    return true;
  };

  const goNext = async () => {
    if (step === 1) {
      const err = validateStep1();
      if (err) {
        toast("error", err);
        return;
      }
    }

    if (step === 3) {
      const ok = await submitRegistration();
      if (!ok) return;
    }

    setStep((s) => Math.min(4, s + 1) as Step);
  };

  const goPrev = () => setStep((s) => Math.max(0, s - 1) as Step);

  const acceptIdImage = (side: IdCardSide, file: File | null | undefined) => {
    if (!file) return;
    if (!/^image\/(jpeg|png)$/.test(file.type)) {
      toast("error", "仅支持 JPG 或 PNG 图片");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast("error", "图片大小不能超过 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setIdImages((prev) => ({ ...prev, [side]: { file, dataUrl: String(reader.result || "") } }));
      toast("success", `${side === "front" ? "人像面" : "国徽面"}已选择`, file.name);
    };
    reader.onerror = () => {
      toast("error", "图片读取失败");
    };
    reader.readAsDataURL(file);
  };

  const clearIdImage = (side: IdCardSide) => {
    setIdImages((prev) => {
      const next = { ...prev };
      delete next[side];
      return next;
    });
  };

  return (
    <AuthShell
      eyebrow="CREATE ACCOUNT"
      title="开启你的声纹守护"
      subtitle="按步骤完成实名认证并设置登录账号，完成后自动登录进入工作台。"
      sideTitle="四步建档，建立可信身份"
      bullets={[
        "身份证正反面图片支持本地选择、预览、替换和移除",
        "手机号 + 密码即注册账号，完成后自动登录",
        "身份证号与证件照片将提交至服务端等待人工核验",
        "活体与指纹为预留流程，便于后续高风险操作二次校验",
      ]}
    >
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          {STEPS.map((s, i) => {
            const done = step > s.k;
            const curr = step === s.k;
            return (
              <div key={s.k} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0"
                    style={{
                      background: done ? "var(--mint)" : curr ? "var(--indigo)" : "var(--canvas-2)",
                      color: done || curr ? "#fff" : "var(--ink-soft)",
                    }}
                  >
                    {done ? <CheckCircle2 size={14} /> : <s.icon size={14} />}
                  </div>
                  <span
                    className="font-mono text-[calc(9px*var(--fz))] uppercase tracking-[0.1em] font-bold hidden sm:block"
                    style={{ color: curr ? "var(--ink)" : "var(--ink-soft)" }}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className="flex-1 h-[2px] mx-2 rounded-full mt-[-18px]"
                    style={{ background: done ? "var(--mint)" : "var(--canvas-3)" }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="min-h-[340px]">
        {step === 0 && <StepRole role={role} setRole={setRole} />}
        {step === 1 && (
          <StepIdCard
            name={name}
            idNumber={idNumber}
            phone={phone}
            password={password}
            password2={password2}
            idImages={idImages}
            onNameChange={setName}
            onIdNumberChange={setIdNumber}
            onPhoneChange={setPhone}
            onPasswordChange={setPassword}
            onPassword2Change={setPassword2}
            onPick={acceptIdImage}
            onClear={clearIdImage}
          />
        )}
        {step === 2 && <StepLiveness />}
        {step === 3 && <StepFingerprint />}
        {step === 4 && <StepDone role={role} name={name} />}
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        {step > 0 && step < 4 ? (
          <button onClick={goPrev} className="btn-ghost py-3 px-5 text-[calc(13px*var(--fz))]">
            <ArrowLeft size={14} />
            上一步
          </button>
        ) : (
          <div />
        )}
        {step < 4 ? (
          <button
            onClick={goNext}
            disabled={submitting}
            className="btn-indigo py-3 px-6 text-[calc(14px*var(--fz))] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "提交中…" : step === 0 ? "开始认证" : step === 3 ? "完成注册" : "下一步"}
            <ArrowRight size={14} />
          </button>
        ) : (
          <Link href={roleHomePath(apiRole)} className="btn-indigo py-3 px-6 text-[calc(14px*var(--fz))]">
            进入工作台
            <ArrowRight size={14} />
          </Link>
        )}
      </div>

      <div className="mt-6 text-center text-[calc(13px*var(--fz))] text-ink-soft font-medium">
        已有账号？
        <Link href="/login" className="ml-1 text-indigo-deep font-bold hover:underline">
          直接登录
        </Link>
      </div>
    </AuthShell>
  );
}

function StepRole({ role, setRole }: { role: Role; setRole: (r: Role) => void }) {
  return (
    <div>
      <div className="font-display text-[calc(18px*var(--fz))] font-extrabold mb-4">选择你的身份</div>
      <div className="grid grid-cols-1 gap-3">
        {[
          {
            k: "family",
            icon: Home,
            title: "家庭用户",
            desc: "个人与亲属使用，侧重告警提示与家属同步。",
            tint: "var(--coral)",
            soft: "var(--coral-soft)",
          },
          {
            k: "enterprise",
            icon: Building2,
            title: "企业用户",
            desc: "机构统一管理，侧重策略配置、API 接入与审计。",
            tint: "var(--indigo)",
            soft: "var(--indigo-soft)",
          },
        ].map((r) => {
          const active = role === r.k;
          return (
            <button
              key={r.k}
              onClick={() => setRole(r.k as Role)}
              className="flex items-start gap-4 p-5 rounded-2xl border-2 text-left transition-all"
              style={{
                borderColor: active ? r.tint : "var(--border)",
                background: active ? r.soft : "var(--surface)",
              }}
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0"
                style={{ background: r.tint }}
              >
                <r.icon size={20} />
              </div>
              <div className="flex-1">
                <div className="font-display text-[calc(16px*var(--fz))] font-extrabold">{r.title}</div>
                <div className="mt-1 text-[calc(13px*var(--fz))] leading-[1.6] text-ink-soft font-medium">{r.desc}</div>
              </div>
              <div
                className="w-5 h-5 rounded-full border-2 shrink-0 mt-1"
                style={{
                  background: active ? r.tint : "transparent",
                  borderColor: active ? r.tint : "var(--ink-ghost)",
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepIdCard({
  name,
  idNumber,
  phone,
  password,
  password2,
  idImages,
  onNameChange,
  onIdNumberChange,
  onPhoneChange,
  onPasswordChange,
  onPassword2Change,
  onPick,
  onClear,
}: {
  name: string;
  idNumber: string;
  phone: string;
  password: string;
  password2: string;
  idImages: Partial<Record<IdCardSide, UploadFile>>;
  onNameChange: (value: string) => void;
  onIdNumberChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onPassword2Change: (value: string) => void;
  onPick: (side: IdCardSide, file: File | null | undefined) => void;
  onClear: (side: IdCardSide) => void;
}) {
  const [showPw, setShowPw] = useState(false);
  return (
    <div>
      <div className="font-display text-[calc(18px*var(--fz))] font-extrabold mb-1">身份与账号</div>
      <p className="text-[calc(13px*var(--fz))] text-ink-soft font-medium mb-5">
        上传身份证正反面，填写实名信息，并设置登录账号（手机号 + 密码）。
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        {ID_CARD_SIDES.map((side) => (
          <IdUploadCard
            key={side.key}
            side={side.key}
            label={side.label}
            value={idImages[side.key]}
            onPick={(file) => onPick(side.key, file)}
            onClear={() => onClear(side.key)}
          />
        ))}
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="姓名" placeholder="张三" value={name} onChange={onNameChange} autoComplete="name" />
          <Input
            label="手机号（登录账号）"
            placeholder="138 0013 4921"
            value={phone}
            onChange={onPhoneChange}
            autoComplete="tel"
          />
        </div>
        <Input
          label="身份证号"
          placeholder="110101 19900101 1234"
          value={idNumber}
          onChange={onIdNumberChange}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Input
              label="设置密码"
              placeholder="至少 6 位"
              value={password}
              onChange={onPasswordChange}
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 bottom-3 p-1.5 rounded-lg hover:bg-canvas-2 text-ink-soft"
              aria-label={showPw ? "隐藏密码" : "显示密码"}
            >
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <Input
            label="确认密码"
            placeholder="再次输入密码"
            value={password2}
            onChange={onPassword2Change}
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
          />
        </div>
      </div>
    </div>
  );
}

function StepLiveness() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <div className="font-display text-[calc(18px*var(--fz))] font-extrabold">活体检测</div>
        <span className="px-2 py-0.5 rounded-full bg-canvas-2 border border-border font-mono text-[calc(9px*var(--fz))] uppercase tracking-[0.1em] font-bold text-ink-soft">
          预留演示
        </span>
      </div>
      <p className="text-[calc(13px*var(--fz))] text-ink-soft font-medium mb-5">
        正式版将接入摄像头活体检测；当前为流程演示，点击下一步即可跳过。
      </p>

      <div
        className="relative mx-auto w-56 aspect-square rounded-full flex items-center justify-center overflow-hidden"
        style={{ background: "linear-gradient(135deg, var(--indigo-soft), var(--mint-soft))" }}
      >
        <div className="absolute inset-4 rounded-full border-2 border-dashed animate-pulse" style={{ borderColor: "var(--indigo)" }} />
        <ScanFace size={72} style={{ color: "var(--indigo-deep)" }} strokeWidth={1.5} />
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-white/20 to-transparent pointer-events-none" />
      </div>

      <div className="mt-5 flex items-center justify-center gap-2 font-mono text-[calc(11px*var(--fz))] uppercase tracking-[0.14em] font-bold text-ink-soft">
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--mint)" }} />
        摄像头已就绪，请看向镜头
      </div>

      <div className="mt-6 p-4 rounded-2xl bg-canvas-2 border border-border">
        <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] font-bold text-ink-soft mb-2">动作指令</div>
        <ol className="space-y-2 text-[calc(13px*var(--fz))] font-medium text-ink-2">
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-mint text-white flex items-center justify-center text-[calc(10px*var(--fz))] font-bold">1</span>
            请眨眼两次
          </li>
          <li className="flex items-center gap-2 opacity-50">
            <span className="w-5 h-5 rounded-full bg-canvas-3 text-ink-soft flex items-center justify-center text-[calc(10px*var(--fz))] font-bold">2</span>
            张嘴
          </li>
          <li className="flex items-center gap-2 opacity-50">
            <span className="w-5 h-5 rounded-full bg-canvas-3 text-ink-soft flex items-center justify-center text-[calc(10px*var(--fz))] font-bold">3</span>
            左右摇头
          </li>
        </ol>
      </div>
    </div>
  );
}

function StepFingerprint() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <div className="font-display text-[calc(18px*var(--fz))] font-extrabold">指纹录入</div>
        <span className="px-2 py-0.5 rounded-full bg-canvas-2 border border-border font-mono text-[calc(9px*var(--fz))] uppercase tracking-[0.1em] font-bold text-ink-soft">
          预留演示
        </span>
      </div>
      <p className="text-[calc(13px*var(--fz))] text-ink-soft font-medium mb-5">
        正式版将接入设备指纹传感器；当前为流程演示。点击「完成注册」将创建账号并提交身份证资料。
      </p>

      <div className="flex justify-center">
        <div
          className="relative w-44 h-44 rounded-3xl flex items-center justify-center"
          style={{ background: "linear-gradient(145deg, var(--mint-soft), var(--indigo-soft))" }}
        >
          <Fingerprint size={96} style={{ color: "var(--mint-deep)" }} strokeWidth={1.5} />
          <div className="absolute inset-0 rounded-3xl border-2 border-mint animate-pulse" />
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] font-bold text-ink-soft">进度</span>
          <span className="font-mono text-[calc(11px*var(--fz))] font-bold text-mint-deep">3 / 5 次</span>
        </div>
        <div className="h-2 rounded-full bg-canvas-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: "60%", background: "linear-gradient(to right, var(--mint), var(--mint-deep))" }}
          />
        </div>
      </div>

      <div className="mt-6 p-4 rounded-2xl bg-amber-soft border border-amber/30">
        <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] font-bold text-amber-deep mb-1">注意</div>
        <p className="text-[calc(12px*var(--fz))] text-amber-deep font-medium leading-[1.6]">
          指纹模板仅保存在本机安全芯片，服务端不存储任何生物原图。更换设备后需要重新录入。
        </p>
      </div>
    </div>
  );
}

function StepDone({ role, name }: { role: Role; name: string }) {
  return (
    <div className="text-center pt-4">
      <div className="mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-5" style={{ background: "var(--mint-soft)" }}>
        <CheckCircle2 size={56} style={{ color: "var(--mint-deep)" }} strokeWidth={2} />
      </div>
      <h3 className="font-display text-[calc(24px*var(--fz))] font-extrabold mb-2">注册完成</h3>
      <p className="text-[calc(14px*var(--fz))] text-ink-soft font-medium max-w-xs mx-auto">
        {name ? `${name} 的` : ""}账号已创建并自动登录，身份证资料已提交等待核验。
        {role === "enterprise"
          ? " 后续可由企业管理员继续分配角色权限。"
          : " 接下来可以继续为家人绑定设备。"}
      </p>
      <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-canvas-2 border border-border font-mono text-[calc(11px*var(--fz))] font-bold">
        <CheckCircle2 size={12} style={{ color: "var(--mint-deep)" }} />
        账号创建 · 自动登录 · 证件提交 已完成
      </div>
    </div>
  );
}

function Input({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.14em] text-ink-soft font-bold">{label}</label>
      <input
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full px-4 py-3.5 rounded-2xl bg-surface border border-border font-body text-[calc(14px*var(--fz))] font-medium placeholder:text-ink-ghost focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/20 transition-all"
      />
    </div>
  );
}

function IdUploadCard({
  side,
  label,
  value,
  onPick,
  onClear,
}: {
  side: IdCardSide;
  label: string;
  value?: UploadFile;
  onPick: (file: File | null | undefined) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const inputId = `register-id-${side}`;

  const openPicker = () => inputRef.current?.click();
  const handleFile = (file: File | null | undefined) => {
    onPick(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  if (value) {
    return (
      <div className="rounded-2xl overflow-hidden border border-border bg-surface">
        <img src={value.dataUrl} alt={`${label}预览`} className="block w-full object-cover" style={{ aspectRatio: "16 / 10" }} />
        <div className="flex items-center justify-between gap-3 px-3 py-2 border-t border-border bg-canvas-2">
          <div className="min-w-0">
            <div className="font-display text-[calc(13px*var(--fz))] font-extrabold truncate">{label}</div>
            <div className="font-mono text-[calc(10px*var(--fz))] text-ink-soft font-bold truncate">
              {value.file.name} · {Math.max(1, Math.round(value.file.size / 1024))} KB
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={openPicker}
              className="px-2.5 py-1 rounded-full text-[calc(11px*var(--fz))] font-bold border border-border hover:bg-surface"
            >
              替换
            </button>
            <button
              type="button"
              onClick={onClear}
              className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-surface"
              aria-label={`移除${label}`}
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
          onChange={(e) => handleFile(e.target.files?.[0])}
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
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
      className="p-5 rounded-2xl border-2 border-dashed transition-colors cursor-pointer bg-surface text-center outline-none"
      style={{
        borderColor: dragging ? "var(--indigo)" : "var(--border)",
        background: dragging ? "color-mix(in srgb, var(--indigo) 8%, transparent)" : "var(--surface)",
      }}
    >
      <ImageIcon size={28} className="mx-auto mb-2 text-ink-soft" />
      <div className="font-display text-[calc(14px*var(--fz))] font-extrabold">上传{label}</div>
      <div className="font-mono text-[calc(10px*var(--fz))] uppercase tracking-[0.12em] text-ink-soft font-bold mt-1">
        可从电脑文件夹选择 JPG / PNG
      </div>
      <div className="mt-3 text-[calc(12px*var(--fz))] font-medium text-ink-soft">支持点击选择，也支持拖拽到这里</div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
