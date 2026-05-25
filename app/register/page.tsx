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
  Fingerprint,
  Home,
  Image as ImageIcon,
  ScanFace,
  User,
  X,
} from "lucide-react";
import AuthShell from "@/components/AuthShell";
import { useToast } from "@/components/shared/Toast";

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
  const [step, setStep] = useState<Step>(0);
  const [role, setRole] = useState<Role>("family");
  const [name, setName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [idImages, setIdImages] = useState<Partial<Record<IdCardSide, UploadFile>>>({});

  const goNext = async () => {
    if (step === 1) {
      const trimmedName = name.trim();
      const trimmedId = idNumber.trim();
      if (!trimmedName) {
        toast("error", "请输入姓名");
        return;
      }
      if (!trimmedId) {
        toast("error", "请输入身份证号");
        return;
      }
      if (!idImages.front || !idImages.back) {
        toast("error", "请从电脑中选择身份证人像面和国徽面图片");
        return;
      }
      toast("success", "身份证图片已就绪", "正反面图片都可以正常从本地文件夹选择");
    }

    if (step === 3) {
      toast("success", "注册资料已保存", "身份证正反面图片会继续保留在当前流程中");
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
      subtitle="按步骤完成实名与生物特征认证，身份证正反面可直接从本地文件夹选择上传。"
      sideTitle="四步建档，建立可信身份"
      bullets={[
        "身份证 OCR 与实名核验联动，确保账户身份真实可追溯",
        "正反面图片支持本地文件夹选择、预览、替换和移除",
        "活体与指纹流程继续保留，便于后续高风险操作二次校验",
        "敏感资料仅在当前流程中处理，避免无意义的上传阻塞",
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
                    className="font-mono text-[9px] uppercase tracking-[0.1em] font-bold hidden sm:block"
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
            idImages={idImages}
            onNameChange={setName}
            onIdNumberChange={setIdNumber}
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
          <button onClick={goPrev} className="btn-ghost py-3 px-5 text-[13px]">
            <ArrowLeft size={14} />
            上一步
          </button>
        ) : (
          <div />
        )}
        {step < 4 ? (
          <button onClick={goNext} className="btn-indigo py-3 px-6 text-[14px]">
            {step === 0 ? "开始认证" : step === 3 ? "完成录入" : "下一步"}
            <ArrowRight size={14} />
          </button>
        ) : (
          <Link href="/app" className="btn-indigo py-3 px-6 text-[14px]">
            进入工作台
            <ArrowRight size={14} />
          </Link>
        )}
      </div>

      <div className="mt-6 text-center text-[13px] text-ink-soft font-medium">
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
      <div className="font-display text-[18px] font-extrabold mb-4">选择你的身份</div>
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
                <div className="font-display text-[16px] font-extrabold">{r.title}</div>
                <div className="mt-1 text-[13px] leading-[1.6] text-ink-soft font-medium">{r.desc}</div>
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
  idImages,
  onNameChange,
  onIdNumberChange,
  onPick,
  onClear,
}: {
  name: string;
  idNumber: string;
  idImages: Partial<Record<IdCardSide, UploadFile>>;
  onNameChange: (value: string) => void;
  onIdNumberChange: (value: string) => void;
  onPick: (side: IdCardSide, file: File | null | undefined) => void;
  onClear: (side: IdCardSide) => void;
}) {
  return (
    <div>
      <div className="font-display text-[18px] font-extrabold mb-1">身份证核验</div>
      <p className="text-[13px] text-ink-soft font-medium mb-5">
        从电脑文件夹选择身份证人像面和国徽面图片，系统会在当前流程中保留预览与校验状态。
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
        <Input label="姓名" placeholder="张三" value={name} onChange={onNameChange} />
        <Input
          label="身份证号"
          placeholder="110101 19900101 1234"
          value={idNumber}
          onChange={onIdNumberChange}
        />
      </div>
    </div>
  );
}

function StepLiveness() {
  return (
    <div>
      <div className="font-display text-[18px] font-extrabold mb-1">活体检测</div>
      <p className="text-[13px] text-ink-soft font-medium mb-5">
        请正面对准摄像头，按屏幕提示完成眨眼、张嘴、摇头动作。
      </p>

      <div
        className="relative mx-auto w-56 aspect-square rounded-full flex items-center justify-center overflow-hidden"
        style={{ background: "linear-gradient(135deg, var(--indigo-soft), var(--mint-soft))" }}
      >
        <div className="absolute inset-4 rounded-full border-2 border-dashed animate-pulse" style={{ borderColor: "var(--indigo)" }} />
        <ScanFace size={72} style={{ color: "var(--indigo-deep)" }} strokeWidth={1.5} />
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-white/20 to-transparent pointer-events-none" />
      </div>

      <div className="mt-5 flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] font-bold text-ink-soft">
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--mint)" }} />
        摄像头已就绪，请看向镜头
      </div>

      <div className="mt-6 p-4 rounded-2xl bg-canvas-2 border border-border">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-ink-soft mb-2">动作指令</div>
        <ol className="space-y-2 text-[13px] font-medium text-ink-2">
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-mint text-white flex items-center justify-center text-[10px] font-bold">1</span>
            请眨眼两次
          </li>
          <li className="flex items-center gap-2 opacity-50">
            <span className="w-5 h-5 rounded-full bg-canvas-3 text-ink-soft flex items-center justify-center text-[10px] font-bold">2</span>
            张嘴
          </li>
          <li className="flex items-center gap-2 opacity-50">
            <span className="w-5 h-5 rounded-full bg-canvas-3 text-ink-soft flex items-center justify-center text-[10px] font-bold">3</span>
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
      <div className="font-display text-[18px] font-extrabold mb-1">指纹录入</div>
      <p className="text-[13px] text-ink-soft font-medium mb-5">
        把手指放在指纹传感器上，重复按压 5 次以建立本地模板。
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
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-ink-soft">进度</span>
          <span className="font-mono text-[11px] font-bold text-mint-deep">3 / 5 次</span>
        </div>
        <div className="h-2 rounded-full bg-canvas-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: "60%", background: "linear-gradient(to right, var(--mint), var(--mint-deep))" }}
          />
        </div>
      </div>

      <div className="mt-6 p-4 rounded-2xl bg-amber-soft border border-amber/30">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-amber-deep mb-1">注意</div>
        <p className="text-[12px] text-amber-deep font-medium leading-[1.6]">
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
      <h3 className="font-display text-[24px] font-extrabold mb-2">认证完成</h3>
      <p className="text-[14px] text-ink-soft font-medium max-w-xs mx-auto">
        {name ? `${name} 的` : ""}账号资料已建档，身份证正反面图片已经完成本地选择与预览流程。
        {role === "enterprise"
          ? " 后续可由企业管理员继续分配角色权限。"
          : " 接下来可以继续为家人绑定设备。"}
      </p>
      <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-canvas-2 border border-border font-mono text-[11px] font-bold">
        <CheckCircle2 size={12} style={{ color: "var(--mint-deep)" }} />
        身份证核验、活体、指纹三项流程已通过演示校验
      </div>
    </div>
  );
}

function Input({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full px-4 py-3.5 rounded-2xl bg-surface border border-border font-body text-[14px] font-medium placeholder:text-ink-ghost focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/20 transition-all"
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
            <div className="font-display text-[13px] font-extrabold truncate">{label}</div>
            <div className="font-mono text-[10px] text-ink-soft font-bold truncate">
              {value.file.name} · {Math.max(1, Math.round(value.file.size / 1024))} KB
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={openPicker}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold border border-border hover:bg-surface"
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
      <div className="font-display text-[14px] font-extrabold">上传{label}</div>
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft font-bold mt-1">
        可从电脑文件夹选择 JPG / PNG
      </div>
      <div className="mt-3 text-[12px] font-medium text-ink-soft">支持点击选择，也支持拖拽到这里</div>
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
