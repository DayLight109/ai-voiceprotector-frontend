"use client";
import { useState } from "react";
import Link from "next/link";
import { User, CreditCard, Camera, Fingerprint, CheckCircle2, ArrowRight, ArrowLeft, ScanFace, Building2, Home } from "lucide-react";
import AuthShell from "@/components/AuthShell";

type Step = 0 | 1 | 2 | 3 | 4;
type Role = "family" | "enterprise";

const STEPS = [
  { k: 0, label: "选择身份", icon: User },
  { k: 1, label: "身份证核验", icon: CreditCard },
  { k: 2, label: "活体检测", icon: Camera },
  { k: 3, label: "指纹录入", icon: Fingerprint },
  { k: 4, label: "完成", icon: CheckCircle2 },
] as const;

export default function RegisterPage() {
  const [step, setStep] = useState<Step>(0);
  const [role, setRole] = useState<Role>("family");

  const next = () => setStep((s) => Math.min(4, (s + 1)) as Step);
  const prev = () => setStep((s) => Math.max(0, (s - 1)) as Step);

  return (
    <AuthShell
      eyebrow="CREATE ACCOUNT"
      title="开启你的声纹守护"
      subtitle="按步骤完成实名与生物特征认证，全程端侧处理，不上传原始生物数据。"
      sideTitle="四步实名，一次建档，终身守护。"
      bullets={[
        "身份证 OCR + 公安核验，确保账户真实可追溯",
        "活体检测防止照片 / 视频攻击，降低盗号风险",
        "指纹本地加密存储，按需二次验证高危操作",
        "符合《个人信息保护法》最小必要原则",
      ]}
    >
      {/* 步骤条 */}
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
                  <div className="flex-1 h-[2px] mx-2 rounded-full mt-[-18px]" style={{ background: done ? "var(--mint)" : "var(--canvas-3)" }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="min-h-[340px]">
        {step === 0 && <StepRole role={role} setRole={setRole} />}
        {step === 1 && <StepIdCard />}
        {step === 2 && <StepLiveness />}
        {step === 3 && <StepFingerprint />}
        {step === 4 && <StepDone role={role} />}
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        {step > 0 && step < 4 ? (
          <button
            onClick={prev}
            className="btn-ghost py-3 px-5 text-[13px]"
          >
            <ArrowLeft size={14} />
            上一步
          </button>
        ) : (
          <div />
        )}
        {step < 4 ? (
          <button
            onClick={next}
            className="btn-indigo py-3 px-6 text-[14px]"
          >
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
          { k: "family", icon: Home, title: "家庭用户", desc: "个人与亲属使用，侧重告警提示与家属同步", tint: "var(--coral)", soft: "var(--coral-soft)" },
          { k: "enterprise", icon: Building2, title: "企业用户", desc: "机构统一管理，侧重策略配置、API 接入与审计", tint: "var(--indigo)", soft: "var(--indigo-soft)" },
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

function StepIdCard() {
  return (
    <div>
      <div className="font-display text-[18px] font-extrabold mb-1">身份证核验</div>
      <p className="text-[13px] text-ink-soft font-medium mb-5">上传身份证正反面，系统将 OCR 自动识别并调用公安接口核验。</p>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {["人像面", "国徽面"].map((side) => (
          <div key={side} className="p-5 rounded-2xl border-2 border-dashed border-border hover:border-indigo transition-colors cursor-pointer bg-surface text-center">
            <CreditCard size={28} className="mx-auto mb-2 text-ink-soft" />
            <div className="font-display text-[14px] font-extrabold">上传{side}</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft font-bold mt-1">JPG / PNG · ≤ 5MB</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <Input label="姓名" placeholder="张三" />
        <Input label="身份证号" placeholder="110101 ···· 1234" />
      </div>
    </div>
  );
}

function StepLiveness() {
  return (
    <div>
      <div className="font-display text-[18px] font-extrabold mb-1">活体检测</div>
      <p className="text-[13px] text-ink-soft font-medium mb-5">请正面面对摄像头，按屏幕提示完成眨眼、张嘴、摇头动作。</p>

      <div className="relative mx-auto w-56 aspect-square rounded-full flex items-center justify-center overflow-hidden" style={{ background: "linear-gradient(135deg, var(--indigo-soft), var(--mint-soft))" }}>
        <div className="absolute inset-4 rounded-full border-2 border-dashed animate-pulse" style={{ borderColor: "var(--indigo)" }} />
        <ScanFace size={72} style={{ color: "var(--indigo-deep)" }} strokeWidth={1.5} />
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-white/20 to-transparent pointer-events-none" />
      </div>

      <div className="mt-5 flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] font-bold text-ink-soft">
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--mint)" }} />
        摄像头已就绪 · 请看向镜头
      </div>

      <div className="mt-6 p-4 rounded-2xl bg-canvas-2 border border-border">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-ink-soft mb-2">动作指令</div>
        <ol className="space-y-2 text-[13px] font-medium text-ink-2">
          <li className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-mint text-white flex items-center justify-center text-[10px] font-bold">1</span>请眨眼两次</li>
          <li className="flex items-center gap-2 opacity-50"><span className="w-5 h-5 rounded-full bg-canvas-3 text-ink-soft flex items-center justify-center text-[10px] font-bold">2</span>张嘴</li>
          <li className="flex items-center gap-2 opacity-50"><span className="w-5 h-5 rounded-full bg-canvas-3 text-ink-soft flex items-center justify-center text-[10px] font-bold">3</span>左右摇头</li>
        </ol>
      </div>
    </div>
  );
}

function StepFingerprint() {
  return (
    <div>
      <div className="font-display text-[18px] font-extrabold mb-1">指纹录入</div>
      <p className="text-[13px] text-ink-soft font-medium mb-5">把手指放在指纹传感器上，重复按压 5 次以建立本地模板。</p>

      <div className="flex justify-center">
        <div className="relative w-44 h-44 rounded-3xl flex items-center justify-center" style={{ background: "linear-gradient(145deg, var(--mint-soft), var(--indigo-soft))" }}>
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
          <div className="h-full rounded-full transition-all" style={{ width: "60%", background: "linear-gradient(to right, var(--mint), var(--mint-deep))" }} />
        </div>
      </div>

      <div className="mt-6 p-4 rounded-2xl bg-amber-soft border border-amber/30">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-amber-deep mb-1">注意</div>
        <p className="text-[12px] text-amber-deep font-medium leading-[1.6]">
          指纹模板仅保存在本机安全芯片，服务端不存储任何生物原图。如更换设备需重新录入。
        </p>
      </div>
    </div>
  );
}

function StepDone({ role }: { role: Role }) {
  return (
    <div className="text-center pt-4">
      <div className="mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-5" style={{ background: "var(--mint-soft)" }}>
        <CheckCircle2 size={56} style={{ color: "var(--mint-deep)" }} strokeWidth={2} />
      </div>
      <h3 className="font-display text-[24px] font-extrabold mb-2">认证完成</h3>
      <p className="text-[14px] text-ink-soft font-medium max-w-xs mx-auto">
        你的账户已建档，生物特征已在本地加密保存。{role === "enterprise" ? "请联系企业管理员分配角色权限。" : "接下来可以为家人绑定设备。"}
      </p>
      <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-canvas-2 border border-border font-mono text-[11px] font-bold">
        <CheckCircle2 size={12} style={{ color: "var(--mint-deep)" }} />
        身份证核验 · 活体 · 指纹 三项全部通过
      </div>
    </div>
  );
}

function Input({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft font-bold">{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        className="mt-2 w-full px-4 py-3.5 rounded-2xl bg-surface border border-border font-body text-[14px] font-medium placeholder:text-ink-ghost focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/20 transition-all"
      />
    </div>
  );
}
