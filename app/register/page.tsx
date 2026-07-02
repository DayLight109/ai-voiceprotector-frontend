"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  Gauge,
  Home,
  House,
  Image as ImageIcon,
  Network,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { AuthVisualPanel, type AuthPanelContent } from "@/components/AuthVisualPanel";
import { useToast } from "@/components/shared/Toast";
import { api, APIError } from "@/lib/api";
import { useAuth, roleHomePath } from "@/lib/auth";
import familyLoginImage from "@/photopack/jiating01.jpg";
import enterpriseLoginImage from "@/photopack/qiye01.jpeg";

type Step = 0 | 1 | 2;
type Role = "family" | "enterprise";
type IdCardSide = "front" | "back";
type UploadFile = { file: File; dataUrl: string };

const STEPS = [
  { k: 0, label: "Select Identity", icon: User },
  { k: 1, label: "Verify ID", icon: CreditCard },
  { k: 2, label: "Complete", icon: CheckCircle2 },
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

  // 右侧视觉面板文案与登录页保持一致（同一套审美配置）
  const panelContent: AuthPanelContent = role === "enterprise"
    ? {
        sideTitle: "企业级反诈中枢，开箱即接入。",
        body: "SENTINEL 将来电溯源、Whisper 转写与话术语义判定接入企业防护链路，让客服、风控与管理团队在同一个安全中枢里完成处置。",
        image: enterpriseLoginImage,
        cards: [
          { icon: Gauge, title: "毫秒级判决", body: "API 对接运营商 / 金融风控，通话接入后快速完成风险判定。" },
          { icon: Network, title: "集中策略矩阵", body: "统一管理员工账号、角色权限和企业黑白名单策略。" },
          { icon: House, title: "证据链留存", body: "判决过程、录音策略和审计日志按权限加密留存。" },
        ],
      }
    : {
        sideTitle: "让每一位家人都活在算法的保护里。",
        body: "声纹捕手在陌生来电进入的瞬间并行检查信令来源、语音转写和高风险话术，尽量把危险挡在家人接听之前。",
        image: familyLoginImage,
        cards: [
          { icon: Gauge, title: "毫秒级响应", body: "识别高风险来电后即时提醒、拦截或同步给紧急联系人。" },
          { icon: Network, title: "三层判决机制", body: "来电溯源、语音转写、话术语义并行工作，减少单点误判。" },
          { icon: House, title: "家庭安心防护", body: "老人手机托管、家属同步告警，关键时刻不再错过。" },
        ],
      };

  const validateStep1 = (): string | null => {
    if (!name.trim()) return "请输入姓名";
    if (!/^\d{17}[\dXx]$/.test(idNumber.replace(/\s/g, ""))) return "身份证号格式不正确（18 位）";
    if (!/^1\d{10}$/.test(phone.replace(/\s/g, ""))) return "请输入 11 位手机号";
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) return "密码至少 8 位，且包含字母和数字";
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

    if (step === 1) {
      const ok = await submitRegistration();
      if (!ok) return;
    }

    setStep((s) => Math.min(2, s + 1) as Step);
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

  const title = "开启你的声纹守护";
  const subtitle = "按步骤完成实名认证并设置登录账号，完成后自动登录进入工作台。";

  return (
    <main
      className="min-h-dvh overflow-x-hidden bg-[#f8f9ff] text-[#0b1c30] login-replica"
      style={{ fontFamily: "var(--font-plus-jakarta), var(--font-noto-sans), system-ui, sans-serif" }}
    >
      <div className="grid min-h-dvh lg:grid-cols-[clamp(500px,37.5vw,600px)_minmax(0,1fr)]">
        <section className="relative flex min-h-dvh flex-col bg-[#f8f9ff] px-[clamp(28px,3.125vw,50px)] py-[clamp(28px,3.9vh,50px)]">
          <div className="flex items-center justify-between">
            <Link href="/" className="group flex w-fit items-center gap-[14px] text-[#101828]">
              <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#071426] shadow-[0_12px_24px_rgba(9,20,38,0.18)] transition-transform duration-300 group-hover:-translate-y-0.5">
                <ShieldCheck size={22} className="text-white" strokeWidth={2.2} />
              </span>
              <span className="text-[19px] font-semibold tracking-[-0.01em]">声纹捕手</span>
            </Link>
            <Link
              href="/"
              className="text-[13px] font-semibold tracking-[0.01em] text-[#737d92] transition-colors hover:text-[#091426]"
            >
              ← 返回主页
            </Link>
          </div>

          <div className="mx-auto mt-[clamp(40px,7vh,86px)] w-full max-w-[440px]">
            <div className="space-y-[12px]">
              <h1 className="text-[clamp(26px,1.9vw,31px)] font-extrabold leading-[1.14] tracking-[-0.025em] text-[#0b1c30]">
                {title}
              </h1>
              <p className="text-[15px] font-normal leading-[1.6] tracking-[0.005em] text-[#5b6475]">
                {subtitle}
              </p>
            </div>

            {/* 步骤指示器 */}
            <div className="mt-[clamp(24px,3vh,38px)] flex items-center">
              {STEPS.map((s, i) => {
                const done = step > s.k;
                const curr = step === s.k;
                return (
                  <div key={s.k} className="flex flex-1 items-center last:flex-none">
                    <div className="flex flex-col items-center gap-[7px]">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                          done
                            ? "bg-[#37d99c] text-white shadow-[0_6px_16px_rgba(55,217,156,0.35)]"
                            : curr
                              ? "bg-[#071426] text-white shadow-[0_8px_18px_rgba(9,20,38,0.22)]"
                              : "bg-[#e7ebf3] text-[#aab0bd]"
                        }`}
                      >
                        {done ? <CheckCircle2 size={16} /> : <s.icon size={16} />}
                      </div>
                      <span
                        className={`hidden text-[10px] font-bold uppercase tracking-[0.1em] sm:block ${
                          curr ? "text-[#091426]" : "text-[#9aa0ad]"
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        className={`mx-2 mt-[-18px] h-[2px] flex-1 rounded-full transition-colors duration-300 ${
                          done ? "bg-[#37d99c]" : "bg-[#e1e4ec]"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-[clamp(22px,2.6vh,32px)] min-h-[300px]">
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
              {step === 2 && <StepDone role={role} name={name} />}
            </div>

            <div className="mt-[clamp(22px,2.6vh,32px)] flex items-center justify-between gap-3">
              {step > 0 && step < 2 ? (
                <button
                  onClick={goPrev}
                  className="inline-flex h-[48px] items-center gap-2 rounded-full border border-[#d3d6df] bg-white px-5 text-[14px] font-semibold text-[#3c475a] transition hover:border-[#aab0bd] hover:bg-[#f1f4fa]"
                >
                  <ArrowLeft size={15} />
                  上一步
                </button>
              ) : (
                <div />
              )}
              {step < 2 ? (
                <button
                  onClick={goNext}
                  disabled={submitting}
                  className="inline-flex h-[48px] items-center gap-2 rounded-full bg-[#071426] px-7 text-[14px] font-bold tracking-[0.02em] text-white shadow-[0_14px_28px_rgba(9,20,38,0.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#0b1c30] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "提交中…" : step === 0 ? "开始认证" : "完成注册"}
                  <ArrowRight size={15} />
                </button>
              ) : (
                <Link
                  href={roleHomePath(apiRole)}
                  className="inline-flex h-[48px] items-center gap-2 rounded-full bg-[#071426] px-7 text-[14px] font-bold tracking-[0.02em] text-white shadow-[0_14px_28px_rgba(9,20,38,0.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#0b1c30]"
                >
                  进入工作台
                  <ArrowRight size={15} />
                </Link>
              )}
            </div>

            <div className="mt-[clamp(20px,2.4vh,30px)] text-center text-[14px] font-medium tracking-[0] text-[#5b6475]">
              已有账号？
              <Link href="/login" className="ml-2 font-semibold text-[#091426] transition hover:text-[#545f73]">
                直接登录
              </Link>
            </div>
          </div>

          <div className="mt-auto pt-10 text-[13px] font-medium uppercase tracking-[0.08em] text-[#8a909c]">
            © 2026 SENTINEL 声纹捕手 · 实时 AI 语音反诈平台
          </div>
        </section>

        <AuthVisualPanel content={panelContent} />
      </div>
    </main>
  );
}

function StepRole({ role, setRole }: { role: Role; setRole: (r: Role) => void }) {
  const options = [
    {
      k: "family" as const,
      icon: Home,
      title: "家庭用户",
      desc: "个人与亲属使用，侧重告警提示与家属同步。",
    },
    {
      k: "enterprise" as const,
      icon: Building2,
      title: "企业用户",
      desc: "机构统一管理，侧重策略配置、API 接入与审计。",
    },
  ];
  return (
    <div>
      <div className="text-[12px] font-bold uppercase tracking-[0.09em] text-[#5b6475]">选择你的身份</div>
      <div className="mt-3 grid grid-cols-1 gap-3">
        {options.map((r) => {
          const active = role === r.k;
          return (
            <button
              key={r.k}
              onClick={() => setRole(r.k)}
              className={`group flex items-start gap-4 rounded-[18px] border-2 p-4 text-left transition-all duration-200 ${
                active ? "border-[#091426] bg-[#eef3ff]" : "border-[#e1e4ec] bg-white hover:border-[#c5c9d4]"
              }`}
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-white transition-colors duration-200 ${
                  active ? "bg-[#071426]" : "bg-[#b4bac6] group-hover:bg-[#969db0]"
                }`}
              >
                <r.icon size={20} />
              </span>
              <div className="flex-1">
                <div className="text-[16px] font-bold text-[#0b1c30]">{r.title}</div>
                <div className="mt-1 text-[13px] font-normal leading-[1.6] text-[#5b6475]">{r.desc}</div>
              </div>
              <span
                className={`mt-1 h-5 w-5 shrink-0 rounded-full border-2 transition ${
                  active ? "border-[#091426] bg-[#091426] shadow-[inset_0_0_0_4px_#fff]" : "border-[#c1c5ce] bg-white"
                }`}
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
      <div className="text-[12px] font-bold uppercase tracking-[0.09em] text-[#5b6475]">身份与账号</div>
      <p className="mt-2 mb-5 text-[13px] font-normal leading-[1.6] text-[#737d92]">
        上传身份证正反面，填写实名信息，并设置登录账号（手机号 + 密码）。
      </p>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="姓名" placeholder="请输入真实姓名" value={name} onChange={onNameChange} autoComplete="name" />
          <Input
            label="手机号（登录账号）"
            placeholder="11 位手机号"
            value={phone}
            onChange={onPhoneChange}
            autoComplete="tel"
          />
        </div>
        <Input
          label="身份证号"
          placeholder="请输入 18 位身份证号"
          value={idNumber}
          onChange={onIdNumberChange}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="relative">
            <Input
              label="设置密码"
              placeholder="至少 8 位，含字母和数字"
              value={password}
              onChange={onPasswordChange}
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute bottom-[13px] right-[14px] flex h-8 w-8 items-center justify-center rounded-full text-[#aab0bd] transition hover:bg-[#eff4ff] hover:text-[#091426]"
              aria-label={showPw ? "隐藏密码" : "显示密码"}
            >
              {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
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

function StepDone({ role, name }: { role: Role; name: string }) {
  return (
    <div className="pt-2 text-center">
      <div
        className="mx-auto mb-5 flex h-[88px] w-[88px] items-center justify-center rounded-full"
        style={{ background: "#dcf7ec" }}
      >
        <CheckCircle2 size={52} style={{ color: "#2db67f" }} strokeWidth={2} />
      </div>
      <h3 className="text-[clamp(22px,1.6vw,26px)] font-extrabold tracking-[-0.02em] text-[#0b1c30]">注册完成</h3>
      <p className="mx-auto mt-2 max-w-xs text-[14px] font-normal leading-[1.6] text-[#5b6475]">
        {name ? `${name} 的` : ""}账号已创建并自动登录，身份证资料已提交等待核验。
        {role === "enterprise"
          ? " 后续可由企业管理员继续分配角色权限。"
          : " 接下来可以继续为家人绑定设备。"}
      </p>
      <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#d8e0ec] bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.06em] text-[#5b6475]">
        <CheckCircle2 size={13} style={{ color: "#2db67f" }} />
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
      <label className="block text-[12px] font-bold uppercase tracking-[0.08em] text-[#5b6475]">{label}</label>
      <input
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-[8px] h-[52px] w-full rounded-full border border-[#d3d6df] bg-white px-5 text-[15px] font-medium tracking-[0] text-[#0b1c30] shadow-[0_1px_2px_rgba(30,41,59,0.04)] outline-none transition duration-200 placeholder:font-normal placeholder:text-[#b9beca] focus:border-[#091426] focus:shadow-[0_2px_8px_rgba(9,20,38,0.08)] focus:ring-4 focus:ring-[#d8e3fb]"
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
      <div className="overflow-hidden rounded-[18px] border border-[#dfe3ec] bg-white shadow-[0_1px_2px_rgba(30,41,59,0.04)]">
        <img src={value.dataUrl} alt={`${label}预览`} className="block w-full object-cover" style={{ aspectRatio: "16 / 10" }} />
        <div className="flex items-center justify-between gap-3 border-t border-[#eef1f6] bg-[#f6f8fc] px-3 py-2">
          <div className="min-w-0">
            <div className="truncate text-[13px] font-bold text-[#0b1c30]">{label}</div>
            <div className="truncate text-[10px] font-semibold uppercase tracking-[0.04em] text-[#8a909c]">
              {value.file.name} · {Math.max(1, Math.round(value.file.size / 1024))} KB
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={openPicker}
              className="rounded-full border border-[#d3d6df] px-3 py-1 text-[11px] font-bold text-[#3c475a] transition hover:bg-white"
            >
              替换
            </button>
            <button
              type="button"
              onClick={onClear}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[#d3d6df] text-[#737d92] transition hover:bg-white hover:text-[#091426]"
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
      className={`cursor-pointer rounded-[18px] border-2 border-dashed bg-white p-5 text-center outline-none transition-colors duration-200 ${
        dragging ? "border-[#091426] bg-[#eef3ff]" : "border-[#d3d6df] hover:border-[#aab0bd]"
      }`}
    >
      <ImageIcon size={26} className="mx-auto mb-2 text-[#aab0bd]" />
      <div className="text-[14px] font-bold text-[#0b1c30]">上传{label}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#8a909c]">
        可从电脑文件夹选择 JPG / PNG
      </div>
      <div className="mt-3 text-[12px] font-medium text-[#737d92]">支持点击选择，也支持拖拽到这里</div>
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
